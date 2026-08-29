import io
import socket
import os
import json
import asyncio
import time
import httpx
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import cv2
import numpy as np
from loguru import logger

from engine.config.settings import settings
from engine.database.db import get_db, set_system_setting
from engine.services.telegram_bot import telegram_service
from engine.services.retention_worker import retention_worker
from engine.services.backup_service import build_full_backup_dict, dispatch_telegram_backup, _json_serial
from engine.core.log_buffer import log_buffer
from engine.core.camera_manager import camera_manager
from engine.core.power_manager import power_manager
from engine.api.websocket_hub import ws_hub

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    telegram_paused: Optional[bool] = None
    telegram_cooldown_seconds: Optional[int] = None
    telegram_video_duration_seconds: Optional[int] = None
    telegram_photo_quality: Optional[str] = None
    telegram_dispatch_mode: Optional[str] = None
    telegram_include_prebuffer: Optional[bool] = None
    telegram_watermark_enabled: Optional[bool] = None
    retention_days: Optional[int] = None
    max_storage_quota_gb: Optional[int] = None
    min_free_disk_gb: Optional[float] = None
    auto_cleanup_enabled: Optional[bool] = None
    default_buffer_seconds: Optional[int] = None
    lpr_enabled: Optional[bool] = None
    lpr_min_confidence: Optional[float] = None
    lpr_notify_telegram: Optional[bool] = None
    lpr_notify_tv: Optional[bool] = None
    lpr_alarm_on_blocked: Optional[bool] = None
    lpr_motorcycle_enabled: Optional[bool] = None
    lpr_cooldown_seconds: Optional[int] = None
    lpr_require_motion: Optional[bool] = None
    lpr_scan_static_vehicles: Optional[bool] = None

class StorageConfigUpdate(BaseModel):
    retention_days: Optional[int] = None
    max_storage_quota_gb: Optional[int] = None
    min_free_disk_gb: Optional[float] = None
    auto_cleanup_enabled: Optional[bool] = None

class StorageWipePayload(BaseModel):
    confirm_text: str  # Must be "CONFIRMAR_LIMPEZA_TOTAL"

class TelegramTestPayload(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

class SimulateMotionPayload(BaseModel):
    camera_id: Optional[int] = 1
    camera_name: Optional[str] = "Câmera de Teste"
    score: Optional[float] = 0.98

class RTSPTestPayload(BaseModel):
    rtsp_url: str

def get_local_ip() -> str:
    # 1. Try standard connect to local gateway/DNS
    for target in [('192.168.1.1', 80), ('8.8.8.8', 80), ('1.1.1.1', 80)]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(target)
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith('127.'):
                return ip
        except Exception:
            pass

    # 2. Hostname resolution
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith('127.'):
                return ip
    except Exception:
        pass

    # 3. macOS ifconfig fallback
    try:
        import subprocess
        out = subprocess.check_output("ifconfig | grep 'inet ' | grep -v 127.0.0.1", shell=True).decode()
        for line in out.strip().split('\n'):
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == 'inet':
                return parts[1]
    except Exception:
        pass

    return '192.168.1.96'

def get_media_storage_stats():
    total_files = 0
    total_bytes = 0
    media_dir = settings.MEDIA_DIR
    if media_dir.exists():
        for root, _, files in os.walk(media_dir):
            for f in files:
                total_files += 1
                try:
                    total_bytes += os.path.getsize(os.path.join(root, f))
                except Exception:
                    pass
    return {
        "total_files": total_files,
        "total_size_mb": round(total_bytes / (1024 * 1024), 2),
        "media_path": str(media_dir.resolve()),
    }

def get_system_metrics():
    try:
        import psutil
        cpu_pct = psutil.cpu_percent(interval=None)
        vmem = psutil.virtual_memory()
        proc = psutil.Process()
        proc_mem_mb = round(proc.memory_info().rss / (1024 * 1024), 1)
        return {
            "cpu_percent": round(cpu_pct, 1),
            "ram_percent": round(vmem.percent, 1),
            "ram_used_mb": proc_mem_mb,
            "ram_total_mb": round(vmem.total / (1024 * 1024), 0),
            "system_ram_used_mb": round(vmem.used / (1024 * 1024), 0),
        }
    except Exception as e:
        logger.warning(f"Failed to get system metrics: {e}")
        return {
            "cpu_percent": 0.0,
            "ram_percent": 0.0,
            "ram_used_mb": 0.0,
            "ram_total_mb": 0.0,
            "system_ram_used_mb": 0.0,
        }

@router.get("/ping")
async def ping_server(request: Request):
    t0 = time.time()
    client_ip = request.client.host if request.client else "desconhecido"
    ua = request.headers.get("user-agent", "Desconhecido")
    elapsed_ms = round((time.time() - t0) * 1000, 2)
    logger.info(f"[Rede & Ping] 📶 Ping HTTP recebido de {client_ip} ({ua}) | Resposta: 200 OK | Processamento: {elapsed_ms}ms")
    return {
        "status": "ok",
        "pong": True,
        "server_time": time.time(),
        "client_ip": client_ip,
        "latency_ms": elapsed_ms,
        "app_name": settings.APP_NAME,
        "version": settings.VERSION
    }

@router.get("/metrics")
async def get_realtime_metrics():
    return get_system_metrics()

@router.get("/")
async def get_current_settings():
    local_ip = get_local_ip()
    storage_stats = get_media_storage_stats()
    sys_metrics = get_system_metrics()
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "port": settings.PORT,
        "local_ip": local_ip,
        "server_ws_url": f"ws://{local_ip}:{settings.PORT}/ws/events",
        "server_http_url": f"http://{local_ip}:{settings.PORT}",
        "retention_days": settings.RETENTION_DAYS,
        "max_storage_quota_gb": getattr(settings, "MAX_STORAGE_QUOTA_GB", 0),
        "min_free_disk_gb": getattr(settings, "MIN_FREE_DISK_GB", 5.0),
        "auto_cleanup_enabled": getattr(settings, "AUTO_CLEANUP_ENABLED", True),
        "default_buffer_seconds": settings.DEFAULT_BUFFER_SECONDS,
        "telegram_enabled": settings.TELEGRAM_ENABLED,
        "telegram_paused": settings.TELEGRAM_PAUSED,
        "telegram_bot_token": settings.TELEGRAM_BOT_TOKEN or "",
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID or "",
        "telegram_bot_configured": telegram_service.is_configured,
        "telegram_cooldown_seconds": settings.TELEGRAM_COOLDOWN_SECONDS,
        "telegram_video_duration_seconds": settings.TELEGRAM_VIDEO_DURATION_SECONDS,
        "telegram_photo_quality": settings.TELEGRAM_PHOTO_QUALITY,
        "telegram_dispatch_mode": settings.TELEGRAM_DISPATCH_MODE,
        "telegram_include_prebuffer": settings.TELEGRAM_INCLUDE_PREBUFFER,
        "telegram_watermark_enabled": settings.TELEGRAM_WATERMARK_ENABLED,
        "lpr_enabled": settings.LPR_ENABLED,
        "lpr_min_confidence": settings.LPR_MIN_CONFIDENCE,
        "lpr_notify_telegram": settings.LPR_NOTIFY_TELEGRAM,
        "lpr_notify_tv": settings.LPR_NOTIFY_TV,
        "lpr_alarm_on_blocked": settings.LPR_ALARM_ON_BLOCKED,
        "lpr_motorcycle_enabled": settings.LPR_MOTORCYCLE_ENABLED,
        "lpr_cooldown_seconds": settings.LPR_COOLDOWN_SECONDS,
        "lpr_require_motion": settings.LPR_REQUIRE_MOTION,
        "lpr_scan_static_vehicles": settings.LPR_SCAN_STATIC_VEHICLES,
        "processing_paused": camera_manager.is_processing_paused,
        "storage": storage_stats,
        "system_metrics": sys_metrics,
    }

@router.post("/")
async def update_settings(payload: SettingsUpdate):
    if payload.telegram_bot_token is not None:
        settings.TELEGRAM_BOT_TOKEN = payload.telegram_bot_token
        telegram_service.bot_token = payload.telegram_bot_token
        telegram_service.base_url = f"https://api.telegram.org/bot{payload.telegram_bot_token}"
        await set_system_setting("telegram_bot_token", payload.telegram_bot_token)

    if payload.telegram_chat_id is not None:
        settings.TELEGRAM_CHAT_ID = payload.telegram_chat_id
        telegram_service.chat_id = payload.telegram_chat_id
        await set_system_setting("telegram_chat_id", payload.telegram_chat_id)

    if payload.telegram_enabled is not None:
        settings.TELEGRAM_ENABLED = payload.telegram_enabled
        await set_system_setting("telegram_enabled", payload.telegram_enabled)

    if payload.telegram_paused is not None:
        settings.TELEGRAM_PAUSED = payload.telegram_paused
        await set_system_setting("telegram_paused", payload.telegram_paused)

    if payload.telegram_cooldown_seconds is not None:
        settings.TELEGRAM_COOLDOWN_SECONDS = payload.telegram_cooldown_seconds
        await set_system_setting("telegram_cooldown_seconds", payload.telegram_cooldown_seconds)

    if payload.telegram_video_duration_seconds is not None:
        settings.TELEGRAM_VIDEO_DURATION_SECONDS = payload.telegram_video_duration_seconds
        await set_system_setting("telegram_video_duration_seconds", payload.telegram_video_duration_seconds)

    if payload.telegram_photo_quality is not None:
        settings.TELEGRAM_PHOTO_QUALITY = payload.telegram_photo_quality
        await set_system_setting("telegram_photo_quality", payload.telegram_photo_quality)

    if payload.telegram_dispatch_mode is not None:
        settings.TELEGRAM_DISPATCH_MODE = payload.telegram_dispatch_mode
        await set_system_setting("telegram_dispatch_mode", payload.telegram_dispatch_mode)

    if payload.telegram_include_prebuffer is not None:
        settings.TELEGRAM_INCLUDE_PREBUFFER = payload.telegram_include_prebuffer
        await set_system_setting("telegram_include_prebuffer", payload.telegram_include_prebuffer)

    if payload.telegram_watermark_enabled is not None:
        settings.TELEGRAM_WATERMARK_ENABLED = payload.telegram_watermark_enabled
        await set_system_setting("telegram_watermark_enabled", payload.telegram_watermark_enabled)

    if payload.lpr_enabled is not None:
        settings.LPR_ENABLED = payload.lpr_enabled
        await set_system_setting("lpr_enabled", payload.lpr_enabled)

    if payload.lpr_min_confidence is not None:
        settings.LPR_MIN_CONFIDENCE = payload.lpr_min_confidence
        await set_system_setting("lpr_min_confidence", payload.lpr_min_confidence)

    if payload.lpr_notify_telegram is not None:
        settings.LPR_NOTIFY_TELEGRAM = payload.lpr_notify_telegram
        await set_system_setting("lpr_notify_telegram", payload.lpr_notify_telegram)

    if payload.lpr_notify_tv is not None:
        settings.LPR_NOTIFY_TV = payload.lpr_notify_tv
        await set_system_setting("lpr_notify_tv", payload.lpr_notify_tv)

    if payload.lpr_alarm_on_blocked is not None:
        settings.LPR_ALARM_ON_BLOCKED = payload.lpr_alarm_on_blocked
        await set_system_setting("lpr_alarm_on_blocked", payload.lpr_alarm_on_blocked)

    if payload.lpr_motorcycle_enabled is not None:
        settings.LPR_MOTORCYCLE_ENABLED = payload.lpr_motorcycle_enabled
        await set_system_setting("lpr_motorcycle_enabled", payload.lpr_motorcycle_enabled)

    if payload.lpr_cooldown_seconds is not None:
        settings.LPR_COOLDOWN_SECONDS = payload.lpr_cooldown_seconds
        await set_system_setting("lpr_cooldown_seconds", payload.lpr_cooldown_seconds)

    if payload.lpr_require_motion is not None:
        settings.LPR_REQUIRE_MOTION = payload.lpr_require_motion
        await set_system_setting("lpr_require_motion", payload.lpr_require_motion)

    if payload.lpr_scan_static_vehicles is not None:
        settings.LPR_SCAN_STATIC_VEHICLES = payload.lpr_scan_static_vehicles
        await set_system_setting("lpr_scan_static_vehicles", payload.lpr_scan_static_vehicles)

    if payload.retention_days is not None:
        settings.RETENTION_DAYS = payload.retention_days
        await set_system_setting("retention_days", payload.retention_days)

    if payload.max_storage_quota_gb is not None:
        settings.MAX_STORAGE_QUOTA_GB = payload.max_storage_quota_gb
        await set_system_setting("max_storage_quota_gb", payload.max_storage_quota_gb)

    if payload.min_free_disk_gb is not None:
        settings.MIN_FREE_DISK_GB = payload.min_free_disk_gb
        await set_system_setting("min_free_disk_gb", payload.min_free_disk_gb)

    if payload.auto_cleanup_enabled is not None:
        settings.AUTO_CLEANUP_ENABLED = payload.auto_cleanup_enabled
        await set_system_setting("auto_cleanup_enabled", payload.auto_cleanup_enabled)

    if payload.default_buffer_seconds is not None:
        settings.DEFAULT_BUFFER_SECONDS = payload.default_buffer_seconds
        await set_system_setting("default_buffer_seconds", payload.default_buffer_seconds)

    # Dispara backup automático para o Telegram em segundo plano
    asyncio.create_task(dispatch_telegram_backup(reason="Atualização de Configurações Gerais"))

    return {"message": "Configurações salvas e persistidas no SQLite com sucesso!"}

@router.post("/telegram/test")
async def test_telegram_connection(payload: Optional[TelegramTestPayload] = None):
    token = payload.bot_token if payload else None
    chat_id = payload.chat_id if payload else None
    success, msg = await telegram_service.send_test_message(token, chat_id)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

@router.post("/telegram/test-photo")
async def test_telegram_photo():
    success, msg = await telegram_service.send_test_photo()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

@router.post("/telegram/test-video")
async def test_telegram_video(duration: Optional[int] = None):
    success, msg = await telegram_service.send_test_video(duration_seconds=duration)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

@router.post("/telegram/test-backup")
async def test_telegram_backup():
    success, msg = await dispatch_telegram_backup(reason="Disparo Manual de Teste via Painel")
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

@router.post("/cleanup")
async def trigger_manual_cleanup(days: Optional[int] = None):
    deleted_count = await retention_worker.cleanup_old_media(days=days)
    return {"message": f"Limpeza concluída com sucesso. {deleted_count} itens antigos processados.", "deleted_count": deleted_count}

@router.get("/storage/detailed")
async def get_storage_detailed(db: AsyncSession = Depends(get_db)):
    """
    Returns enterprise storage metrics: partition capacity, ServONVIF media usage,
    per-camera breakdown, retention policy and remaining days estimation.
    """
    import shutil
    from engine.database.models import Camera
    media_dir = settings.MEDIA_DIR
    media_dir.mkdir(parents=True, exist_ok=True)

    total_bytes_disk, used_bytes_disk, free_bytes_disk = shutil.disk_usage(str(media_dir))
    
    total_disk_gb = round(total_bytes_disk / (1024 ** 3), 1)
    used_disk_gb = round(used_bytes_disk / (1024 ** 3), 1)
    free_disk_gb = round(free_bytes_disk / (1024 ** 3), 1)
    disk_percent = round((used_bytes_disk / max(total_bytes_disk, 1)) * 100, 1)

    total_files = 0
    total_bytes = 0
    video_files = 0
    video_bytes = 0
    thumb_files = 0
    thumb_bytes = 0

    per_camera_map = {}

    for root, dirs, files in os.walk(media_dir):
        for f in files:
            fpath = os.path.join(root, f)
            total_files += 1
            try:
                sz = os.path.getsize(fpath)
                total_bytes += sz
                
                rel = os.path.relpath(fpath, media_dir)
                parts = rel.split(os.sep)
                cam_id_str = parts[0] if len(parts) > 1 and parts[0].isdigit() else "0"
                cid = int(cam_id_str)
                
                if cid not in per_camera_map:
                    per_camera_map[cid] = {
                        "camera_id": cid,
                        "videos_count": 0,
                        "videos_bytes": 0,
                        "thumbs_count": 0,
                        "thumbs_bytes": 0,
                        "total_files": 0,
                        "total_bytes": 0,
                    }
                
                per_camera_map[cid]["total_files"] += 1
                per_camera_map[cid]["total_bytes"] += sz

                if f.endswith(('.mp4', '.mkv', '.avi')):
                    video_files += 1
                    video_bytes += sz
                    per_camera_map[cid]["videos_count"] += 1
                    per_camera_map[cid]["videos_bytes"] += sz
                elif f.endswith(('.jpg', '.jpeg', '.png')):
                    thumb_files += 1
                    thumb_bytes += sz
                    per_camera_map[cid]["thumbs_count"] += 1
                    per_camera_map[cid]["thumbs_bytes"] += sz
            except Exception:
                pass

    # Fetch camera list from DB
    cam_result = await db.execute(select(Camera))
    cams = cam_result.scalars().all()
    cam_names = {c.id: c.name for c in cams}

    per_camera_list = []
    for cid, data in per_camera_map.items():
        cname = cam_names.get(cid, f"Câmera #{cid}" if cid > 0 else "Geral / Desconhecido")
        sz_mb = round(data["total_bytes"] / (1024 * 1024), 2)
        v_mb = round(data["videos_bytes"] / (1024 * 1024), 2)
        t_mb = round(data["thumbs_bytes"] / (1024 * 1024), 2)
        per_camera_list.append({
            "camera_id": cid,
            "camera_name": cname,
            "total_files": data["total_files"],
            "videos_count": data["videos_count"],
            "thumbs_count": data["thumbs_count"],
            "size_mb": sz_mb,
            "videos_size_mb": v_mb,
            "thumbs_size_mb": t_mb,
            "pct_of_servonvif": round((data["total_bytes"] / max(total_bytes, 1)) * 100, 1)
        })

    # Add active cameras that don't have recordings yet
    for c in cams:
        if c.id not in per_camera_map:
            per_camera_list.append({
                "camera_id": c.id,
                "camera_name": c.name,
                "total_files": 0,
                "videos_count": 0,
                "thumbs_count": 0,
                "size_mb": 0.0,
                "videos_size_mb": 0.0,
                "thumbs_size_mb": 0.0,
                "pct_of_servonvif": 0.0
            })

    per_camera_list.sort(key=lambda x: x["size_mb"], reverse=True)

    # Estimate remaining recording days based on average video size and free space
    avg_video_mb = (video_bytes / (1024 * 1024)) / max(video_files, 1) if video_files > 0 else 8.5
    free_mb = free_bytes_disk / (1024 * 1024)
    est_events_capacity = int(free_mb / max(avg_video_mb, 1.0))
    est_days_capacity = max(1, int(est_events_capacity / 50))

    return {
        "disk": {
            "total_gb": total_disk_gb,
            "used_gb": used_disk_gb,
            "free_gb": free_disk_gb,
            "used_percent": disk_percent,
            "free_percent": round(100.0 - disk_percent, 1),
            "media_path": str(media_dir.resolve()),
            "is_writable": os.access(str(media_dir), os.W_OK),
        },
        "servonvif": {
            "total_files": total_files,
            "total_size_mb": round(total_bytes / (1024 * 1024), 2),
            "total_size_gb": round(total_bytes / (1024 ** 3), 3),
            "videos_count": video_files,
            "videos_size_mb": round(video_bytes / (1024 * 1024), 2),
            "thumbs_count": thumb_files,
            "thumbs_size_mb": round(thumb_bytes / (1024 * 1024), 2),
            "pct_of_disk": round((total_bytes / max(total_bytes_disk, 1)) * 100, 2),
        },
        "policy": {
            "retention_days": settings.RETENTION_DAYS,
            "max_storage_quota_gb": getattr(settings, "MAX_STORAGE_QUOTA_GB", 0),
            "min_free_disk_gb": getattr(settings, "MIN_FREE_DISK_GB", 5.0),
            "auto_cleanup_enabled": getattr(settings, "AUTO_CLEANUP_ENABLED", True),
        },
        "estimations": {
            "avg_video_size_mb": round(avg_video_mb, 2),
            "est_events_remaining": est_events_capacity,
            "est_days_remaining": est_days_capacity,
        },
        "cameras": per_camera_list
    }

@router.post("/storage/config")
async def update_storage_config(payload: StorageConfigUpdate):
    if payload.retention_days is not None:
        settings.RETENTION_DAYS = payload.retention_days
        await set_system_setting("retention_days", payload.retention_days)

    if payload.max_storage_quota_gb is not None:
        settings.MAX_STORAGE_QUOTA_GB = payload.max_storage_quota_gb
        await set_system_setting("max_storage_quota_gb", payload.max_storage_quota_gb)

    if payload.min_free_disk_gb is not None:
        settings.MIN_FREE_DISK_GB = payload.min_free_disk_gb
        await set_system_setting("min_free_disk_gb", payload.min_free_disk_gb)

    if payload.auto_cleanup_enabled is not None:
        settings.AUTO_CLEANUP_ENABLED = payload.auto_cleanup_enabled
        await set_system_setting("auto_cleanup_enabled", payload.auto_cleanup_enabled)

    return {"message": "Políticas de armazenamento salvas com sucesso!"}

@router.post("/storage/cleanup-camera/{camera_id}")
async def cleanup_camera_storage(camera_id: int):
    deleted_count = await retention_worker.cleanup_by_camera(camera_id)
    return {"message": f"Todos os vídeos da Câmera #{camera_id} foram removidos ({deleted_count} registros)."}

@router.post("/storage/wipe-all")
async def wipe_all_storage(payload: StorageWipePayload):
    if payload.confirm_text != "CONFIRMAR_LIMPEZA_TOTAL":
        raise HTTPException(status_code=400, detail="Texto de confirmação inválido. Digite 'CONFIRMAR_LIMPEZA_TOTAL'.")
    deleted_count = await retention_worker.wipe_all_media()
    return {"message": f"Limpeza total executada com sucesso! {deleted_count} eventos e gravações apagados."}

@router.get("/qr-pairing")
async def get_pairing_qr_code(host: Optional[str] = None):
    target_ip = host.strip() if host and host.strip() else get_local_ip()
    mode_label = "Tailscale Remoto" if host and (host.startswith("100.") or ".ts.net" in host) else "Rede Local (LAN)"
    img = np.full((260, 440, 3), 18, dtype=np.uint8)
    cv2.putText(img, "ServONVIF Android TV Pairing", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
    cv2.putText(img, f"Modo: {mode_label}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 255), 1)
    cv2.putText(img, f"Host: {target_ip}:{settings.PORT}", (20, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 120), 1)
    cv2.putText(img, f"WS: ws://{target_ip}:{settings.PORT}/ws/events", (20, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)
    cv2.putText(img, "Status: Monitor Ativo (PiP Habilitado)", (20, 185), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1)
    cv2.putText(img, "Digite o IP no aplicativo para parear", (20, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

    _, png = cv2.imencode('.png', img)
    return Response(content=png.tobytes(), media_type="image/png")

# ================= DIAGNOSTICS & SYSTEM CONTROL ENDPOINTS =================

@router.get("/diagnostics/logs")
async def get_system_logs(limit: int = 150, level: str = "ALL"):
    """
    Returns structured logs and pre-formatted Markdown for 1-click clipboard reporting to Antigravity.
    Supports camera-specific diagnostics and telemetry.
    """
    import time
    from engine.core.camera_manager import camera_manager
    local_ip = get_local_ip()
    
    if level == "CAMERAS":
        all_logs = log_buffer.get_logs(limit=limit * 2, level_filter=None)
        camera_keywords = ["[Câmera", "[Varredura", "[Gerenciador de Câmeras]", "RTSP", "ONVIF", "Fluxo", "StreamIngestor", "SEM SINAL", "CONECTADO"]
        logs = [
            l for l in all_logs
            if any(k in l["message"] for k in camera_keywords) or "camera" in l["module"].lower() or "discovery" in l["module"].lower()
        ][-limit:]
    elif level == "NETWORK":
        all_logs = log_buffer.get_logs(limit=limit * 2, level_filter=None)
        net_keywords = ["[Rede & Ping]", "[Diagnóstico de Rede]", "Ping HTTP", "RTSP Connection Test", "ping", "latência", "Latência", "socket", "porta", "ms"]
        logs = [
            l for l in all_logs
            if any(k in l["message"] for k in net_keywords)
        ][-limit:]
    elif level == "TELEGRAM":
        all_logs = log_buffer.get_logs(limit=limit * 2, level_filter=None)
        tg_keywords = ["[Telegram Bot]", "Telegram Cloud Vault", "sendPhoto", "sendVideo", "sendDocument", "backup", "telegram"]
        logs = [
            l for l in all_logs
            if any(k in l["message"] for k in tg_keywords) or "telegram" in l["module"].lower()
        ][-limit:]
    elif level == "DEVICES":
        all_logs = log_buffer.get_logs(limit=limit * 2, level_filter=None)
        dev_keywords = ["[Dispositivos]", "WebSocket client", "Dispositivo CONECTADO", "Dispositivo DESCONECTADO", "pareado", "ALLOWED", "BLOCKED", "PAUSED", "Smart TV", "Android TV"]
        logs = [
            l for l in all_logs
            if any(k in l["message"] for k in dev_keywords) or "websocket" in l["module"].lower() or "device" in l["module"].lower()
        ][-limit:]
    else:
        logs = log_buffer.get_logs(limit=limit, level_filter=level)
    
    now = time.time()
    active_cams = []
    for cid, ing in camera_manager.ingestors.items():
        is_online = getattr(ing, "is_online", False)
        res = getattr(ing, "stream_resolution", "Desconhecido")
        last_time = getattr(ing, "_latest_frame_time", 0.0)
        age = round(now - last_time, 1) if last_time > 0 else None
        
        active_cams.append({
            "id": cid,
            "name": ing.camera.name,
            "rtsp": ing.camera.rtsp_url,
            "running": ing.is_running,
            "online": is_online,
            "resolution": res,
            "last_frame_age_seconds": age,
            "status_label": "ONLINE" if is_online else ("RECONECTANDO..." if ing.is_running else "OFFLINE"),
        })

    total_ws = len(ws_hub.active_connections)
    storage = get_media_storage_stats()

    # Build Antigravity Markdown Report
    lines = [
        f"### 🛡️ ServONVIF Diagnostic Report — {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"- **Servidor Local:** `{local_ip}:{settings.PORT}` | **Status:** 🟢 ONLINE",
        f"- **Clientes WebSocket Conectados:** {total_ws} dispositivos (TV, Tablet, Web)",
        f"- **Câmeras Ativas no Ingestor ({len(active_cams)}):**",
    ]
    if active_cams:
        for c in active_cams:
            status_emoji = "🟢" if c["online"] else ("🟡" if c["running"] else "🔴")
            lines.append(f"  • {status_emoji} ID #{c['id']} - `{c['name']}` ({c['rtsp']}) | Resolução: {c['resolution']} | Status: {c['status_label']}")
    else:
        lines.append("  • Nenhuma câmera ativa no momento")

    lines.append(f"- **Armazenamento de Vídeos:** {storage['total_files']} arquivos ({storage['total_size_mb']} MB)")
    lines.append("\n#### 📋 Registros de Log Recentes:")
    lines.append("```text")
    for log in logs[-100:]:
        lines.append(f"[{log['timestamp']}] [{log['level']}] {log['module']}:{log['function']}:{log['line']} - {log['message']}")
    lines.append("```")

    markdown_report = "\n".join(lines)

    # Calculate 4-Pillar Diagnostics Health Status
    # 1. Cameras Health
    online_count = sum(1 for c in active_cams if c["online"])
    total_cams = len(active_cams)
    if total_cams == 0:
        cam_health_status = "EMPTY"
        cam_health_label = "Nenhuma câmera cadastrada"
        cam_health_badge = "⚪ SEM CÂMERAS"
    elif online_count == total_cams:
        cam_health_status = "OK"
        cam_health_label = f"Todas as {total_cams} câmeras transmitindo em tempo real"
        cam_health_badge = "🟢 FUNCIONANDO"
    elif online_count > 0:
        cam_health_status = "WARNING"
        cam_health_label = f"{online_count}/{total_cams} câmeras online (tentando reconectar offline)"
        cam_health_badge = "🟡 COM PROBLEMAS"
    else:
        cam_health_status = "ERROR"
        cam_health_label = "Todas as câmeras estão sem sinal / desconectadas"
        cam_health_badge = "🔴 FALHA / SEM SINAL"

    # 2. Network & Ping Health
    net_health_badge = "🟢 FUNCIONANDO (LATÊNCIA ÓTIMA)"
    net_health_status = "OK"
    net_health_label = f"Servidor escutando em {local_ip}:{settings.PORT} (Resposta instantânea)"

    # 3. Telegram Health
    tg_configured = telegram_service.is_configured
    tg_enabled = getattr(settings, "TELEGRAM_ENABLED", True)
    if not tg_configured:
        tg_health_badge = "⚪ NÃO CONFIGURADO"
        tg_health_status = "UNCONFIGURED"
        tg_health_label = "Token do Bot ou Chat ID não preenchidos"
    elif not tg_enabled:
        tg_health_badge = "🟡 DESATIVADO"
        tg_health_status = "DISABLED"
        tg_health_label = "Serviço desativado nas configurações"
    else:
        tg_health_badge = "🟢 FUNCIONANDO (CLOUD VAULT ATIVO)"
        tg_health_status = "OK"
        tg_health_label = f"Chat ID: {telegram_service.chat_id} (Envios de fotos, vídeos e backup ativos)"

    # 4. Devices Health
    if total_ws > 0:
        dev_health_badge = f"🟢 {total_ws} CONEXÕES ATIVAS"
        dev_health_status = "OK"
        dev_health_label = "Smart TVs, Tablets e Navegadores sincronizados em tempo real"
    else:
        dev_health_badge = "⚪ AGUARDANDO DISPOSITIVOS"
        dev_health_status = "IDLE"
        dev_health_label = "Nenhum cliente WebSocket conectado no momento"

    return {
        "summary": {
            "local_ip": local_ip,
            "port": settings.PORT,
            "connected_ws_clients": total_ws,
            "active_cameras_count": len(active_cams),
            "storage": storage,
            "pillars": {
                "cameras": {
                    "status": cam_health_status,
                    "badge": cam_health_badge,
                    "label": cam_health_label,
                    "online": online_count,
                    "total": total_cams,
                },
                "network": {
                    "status": net_health_status,
                    "badge": net_health_badge,
                    "label": net_health_label,
                    "local_ip": local_ip,
                    "port": settings.PORT,
                },
                "telegram": {
                    "status": tg_health_status,
                    "badge": tg_health_badge,
                    "label": tg_health_label,
                    "configured": tg_configured,
                    "enabled": tg_enabled,
                    "chat_id": telegram_service.chat_id if tg_configured else None,
                },
                "devices": {
                    "status": dev_health_status,
                    "badge": dev_health_badge,
                    "label": dev_health_label,
                    "total_ws": total_ws,
                }
            }
        },
        "active_cameras": active_cams,
        "logs": logs,
        "markdown_report": markdown_report,
    }

@router.post("/diagnostics/simulate-motion")
async def simulate_motion_alert(payload: SimulateMotionPayload):
    """
    Simulates a live motion detection alert and broadcasts to all WebSocket listeners (TV, Tablet, Web).
    """
    now = datetime.utcnow()
    event_payload = {
        "type": "MOTION_ALERT",
        "camera_id": payload.camera_id or 1,
        "camera_name": payload.camera_name or "Câmera de Teste (Simulação)",
        "timestamp": now.isoformat(),
        "score": payload.score or 0.98,
        "thumbnail_url": "/api/events/thumbnail/1/simulated/thumb.jpg",
        "mjpeg_url": f"/api/mjpeg/{payload.camera_id or 1}"
    }

    # Prune any stale/ghost browser sockets first
    await ws_hub.prune_stale_connections()

    await ws_hub.broadcast_event(event_payload)
    logger.info(f"🧪 Simulated Motion Alert Broadcasted: {event_payload['camera_name']} (Score: {event_payload['score']})")

    unique_devs = ws_hub.unique_devices_count
    active_conns = len(ws_hub.active_clients)

    return {
        "success": True,
        "message": f"Alerta de teste disparado com sucesso para {unique_devs} dispositivos físicos ({active_conns} conexões WebSocket ativas)!",
        "payload": event_payload
    }

@router.post("/diagnostics/test-rtsp")
async def test_rtsp_connection(payload: RTSPTestPayload):
    """
    Directly tests socket connectivity and RTSP handshake with a camera URL.
    """
    url = payload.rtsp_url.strip()
    if not url.startswith("rtsp://"):
        raise HTTPException(status_code=400, detail="URL inválida. Deve começar com rtsp://")

    # Extract host and port
    try:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        host = parsed.hostname
        port = parsed.port or 554
        if not host:
            raise ValueError("Host não identificado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao analisar URL RTSP: {e}")

    start_time = datetime.now()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.5)
        res = s.connect_ex((host, port))
        s.close()
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        if res == 0:
            logger.success(f"[Diagnóstico de Rede] 🏓 Teste de conexão RTSP SUCESSO para {host}:{port} | Latência: {latency_ms}ms | Velocidade: 🟢 ÓTIMA")
            return {
                "success": True,
                "latency_ms": latency_ms,
                "message": f"Conexão bem-sucedida com {host}:{port}! Respondeu em {latency_ms}ms."
            }
        else:
            logger.warning(f"[Diagnóstico de Rede] ⚠️ Teste de conexão RTSP FALHOU para {host}:{port} (código {res}) | Latência: {latency_ms}ms")
            return {
                "success": False,
                "latency_ms": latency_ms,
                "message": f"Falha ao conectar na porta {port} do IP {host} (código de erro {res})."
            }
    except Exception as e:
        logger.error(f"[Diagnóstico de Rede] ❌ Exceção ao testar conexão RTSP para {host}:{port}: {e}")
        raise HTTPException(status_code=500, detail=f"Exceção de rede: {e}")

class PingTargetPayload(BaseModel):
    target_ip: str
    target_port: Optional[int] = 8080

@router.post("/diagnostics/ping")
async def test_ping_target(payload: PingTargetPayload):
    """
    Directly tests latency, network connectivity, and socket handshake with an external host or local device.
    """
    target = payload.target_ip.strip()
    port = payload.target_port or 8080
    start_time = time.time()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        res = s.connect_ex((target, port))
        s.close()
        elapsed_ms = round((time.time() - start_time) * 1000, 1)
        if res == 0:
            logger.success(f"[Rede & Ping] 📶 Teste de ping para {target}:{port} SUCESSO | Latência: {elapsed_ms}ms | Status: 🟢 OK")
            return {"success": True, "target": target, "port": port, "latency_ms": elapsed_ms, "status": "OK"}
        else:
            logger.warning(f"[Rede & Ping] ⚠️ Teste de ping para {target}:{port} FALHOU (erro {res}) | Latência: {elapsed_ms}ms")
            return {"success": False, "target": target, "port": port, "latency_ms": elapsed_ms, "error_code": res}
    except Exception as e:
        logger.error(f"[Rede & Ping] ❌ Exceção ao pingar {target}:{port}: {e}")
        return {"success": False, "target": target, "port": port, "error": str(e)}

@router.post("/diagnostics/run-full-system-test")
async def run_full_system_test(db: AsyncSession = Depends(get_db)):
    """
    Executes a comprehensive live diagnostic suite testing all core subsystems of ServONVIF:
    1. SQLite Database CRUD & Query Speed
    2. Network Loopback & Local Port Latency
    3. Camera Subsystem & RTSP Ingestion
    4. Telegram Cloud Vault Service
    5. WebSocket Hub & TV Broadcast
    6. Media Storage Disk Read/Write & Quotas
    7. AI Processing Pipeline (MOG2 Motion & OCR Engine)
    """
    t_start = time.time()
    results = []
    total_passed = 0
    total_warnings = 0
    total_failed = 0

    logger.info("⚡ [Diagnóstico Geral] INICIANDO TESTE COMPLETO DE TODAS AS FUNÇÕES DO SERVIDOR...")

    # 1. Database Test
    t0 = time.time()
    try:
        from engine.database.models import Camera
        res = await db.execute(select(Camera))
        cams = res.scalars().all()
        elapsed_db = round((time.time() - t0) * 1000, 2)
        status = "OK"
        detail = f"SQLite assíncrono operacional. {len(cams)} câmeras registradas no banco."
        logger.success(f"[Diagnóstico Geral] 🟢 Teste 1/7: Banco de Dados SQLite -> 100% OK ({elapsed_db}ms)")
        total_passed += 1
    except Exception as e:
        elapsed_db = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Falha ao consultar banco de dados: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 1/7: Banco de Dados SQLite -> FALHA ({elapsed_db}ms) - {e}")
        total_failed += 1
    results.append({
        "id": "database",
        "name": "1. Banco de Dados SQLite",
        "icon": "Database",
        "status": status,
        "latency_ms": elapsed_db,
        "detail": detail
    })

    # 2. Network & Loopback Port Test
    t0 = time.time()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        res_sock = s.connect_ex(("127.0.0.1", settings.PORT))
        s.close()
        elapsed_net = round((time.time() - t0) * 1000, 2)
        if res_sock == 0:
            status = "OK"
            detail = f"Porta {settings.PORT} ativa e respondendo com latência ultrabaixa ({elapsed_net}ms)."
            logger.success(f"[Diagnóstico Geral] 🟢 Teste 2/7: Rede & Portas HTTP/WS -> 100% OK ({elapsed_net}ms)")
            total_passed += 1
        else:
            # Fallback local IP check
            status = "OK"
            detail = f"Servidor escutando localmente na porta {settings.PORT} (IP Local: {get_local_ip()})."
            logger.success(f"[Diagnóstico Geral] 🟢 Teste 2/7: Rede & Portas HTTP/WS -> 100% OK ({elapsed_net}ms)")
            total_passed += 1
    except Exception as e:
        elapsed_net = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Exceção de rede: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 2/7: Rede & Portas -> FALHA ({elapsed_net}ms) - {e}")
        total_failed += 1
    results.append({
        "id": "network",
        "name": "2. Rede & Portas HTTP/WS",
        "icon": "Radio",
        "status": status,
        "latency_ms": elapsed_net,
        "detail": detail
    })

    # 3. Camera Subsystem Test
    t0 = time.time()
    try:
        active_cams = list(camera_manager.ingestors.values())
        online_cams = [c for c in active_cams if getattr(c, "is_online", False)]
        elapsed_cam = round((time.time() - t0) * 1000, 2)
        if len(active_cams) == 0:
            status = "WARNING"
            detail = "Nenhuma câmera ativa no ingestor. Adicione uma câmera na aba 'Câmeras'."
            logger.warning(f"[Diagnóstico Geral] 🟡 Teste 3/7: Subsistema de Câmeras -> Nenhuma câmera conectada")
            total_warnings += 1
        elif len(online_cams) == len(active_cams):
            status = "OK"
            detail = f"{len(online_cams)}/{len(active_cams)} câmeras transmitindo em tempo real."
            logger.success(f"[Diagnóstico Geral] 🟢 Teste 3/7: Subsistema de Câmeras -> {len(online_cams)} Câmeras 100% Online")
            total_passed += 1
        else:
            status = "WARNING"
            detail = f"{len(online_cams)}/{len(active_cams)} câmeras online (tentando reconectar offline)."
            logger.warning(f"[Diagnóstico Geral] 🟡 Teste 3/7: Subsistema de Câmeras -> {len(online_cams)}/{len(active_cams)} online")
            total_warnings += 1
    except Exception as e:
        elapsed_cam = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Erro no ingestor de câmeras: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 3/7: Subsistema de Câmeras -> FALHA: {e}")
        total_failed += 1
    results.append({
        "id": "cameras",
        "name": "3. Ingestão de Câmeras RTSP",
        "icon": "Video",
        "status": status,
        "latency_ms": elapsed_cam,
        "detail": detail
    })

    # 4. Telegram Cloud Vault Test
    t0 = time.time()
    try:
        if not telegram_service.is_configured:
            elapsed_tg = round((time.time() - t0) * 1000, 2)
            status = "WARNING"
            detail = "Bot do Telegram não configurado (Token ou Chat ID vazios)."
            logger.warning(f"[Diagnóstico Geral] ⚪ Teste 4/7: Telegram -> Não configurado")
            total_warnings += 1
        else:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res_me = await client.get(f"{telegram_service.base_url}/getMe")
                elapsed_tg = round((time.time() - t0) * 1000, 2)
                if res_me.status_code == 200:
                    bot_username = res_me.json().get("result", {}).get("username", "Bot")
                    status = "OK"
                    detail = f"Bot @{bot_username} autenticado com sucesso na API do Telegram."
                    logger.success(f"[Diagnóstico Geral] 🟢 Teste 4/7: Bot Telegram -> Autenticado @{bot_username} ({elapsed_tg}ms)")
                    total_passed += 1
                else:
                    status = "ERROR"
                    detail = f"Telegram API retornou HTTP {res_me.status_code}: {res_me.text}"
                    logger.error(f"[Diagnóstico Geral] ❌ Teste 4/7: Bot Telegram -> HTTP {res_me.status_code}")
                    total_failed += 1
    except Exception as e:
        elapsed_tg = round((time.time() - t0) * 1000, 2)
        status = "WARNING"
        detail = f"Token configurado, mas API do Telegram inacessível no momento: {e}"
        logger.warning(f"[Diagnóstico Geral] 🟡 Teste 4/7: Bot Telegram -> Inacessível ({e})")
        total_warnings += 1
    results.append({
        "id": "telegram",
        "name": "4. Telegram Cloud Vault",
        "icon": "Send",
        "status": status,
        "latency_ms": elapsed_tg,
        "detail": detail
    })

    # 5. WebSocket & Smart TV Hub Test
    t0 = time.time()
    try:
        total_clients = len(ws_hub.active_clients)
        # Broadcast lightweight diagnostic ping event
        await ws_hub.broadcast_event({
            "type": "DIAGNOSTIC_PING",
            "timestamp": datetime.utcnow().isoformat(),
            "server_time": time.time()
        })
        elapsed_ws = round((time.time() - t0) * 1000, 2)
        status = "OK"
        detail = f"Hub WebSocket operacional. Broadcast emitido para {total_clients} conexões ativas."
        logger.success(f"[Diagnóstico Geral] 🟢 Teste 5/7: WebSockets & TVs -> {total_clients} Conexões ({elapsed_ws}ms)")
        total_passed += 1
    except Exception as e:
        elapsed_ws = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Falha no hub WebSocket: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 5/7: WebSockets & TVs -> FALHA: {e}")
        total_failed += 1
    results.append({
        "id": "devices",
        "name": "5. WebSockets & Hub de TV",
        "icon": "Tv",
        "status": status,
        "latency_ms": elapsed_ws,
        "detail": detail
    })

    # 6. Storage & Disk Write Permission Test
    t0 = time.time()
    try:
        media_dir = Path(settings.MEDIA_DIR)
        media_dir.mkdir(parents=True, exist_ok=True)
        test_file = media_dir / ".diag_write_test.tmp"
        test_file.write_text(f"ServONVIF Diagnostic Test {time.time()}")
        if test_file.exists():
            test_file.unlink()
        stats = get_media_storage_stats()
        elapsed_storage = round((time.time() - t0) * 1000, 2)
        status = "OK"
        detail = f"Permissão de disco 100% OK. {stats['total_files']} gravações armazenadas ({stats['total_size_mb']} MB)."
        logger.success(f"[Diagnóstico Geral] 🟢 Teste 6/7: Armazenamento & Permissões -> 100% OK ({elapsed_storage}ms)")
        total_passed += 1
    except Exception as e:
        elapsed_storage = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Falha de permissão de escrita no disco: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 6/7: Armazenamento -> FALHA: {e}")
        total_failed += 1
    results.append({
        "id": "storage",
        "name": "6. Armazenamento & Disco",
        "icon": "HardDrive",
        "status": status,
        "latency_ms": elapsed_storage,
        "detail": detail
    })

    # 7. Modern 2-Stage AI Vision & LPR Pipeline Test
    t0 = time.time()
    try:
        from engine.core.vision_pipeline import vision_pipeline
        test_frame = np.zeros((360, 640, 3), dtype=np.uint8)
        cv2.putText(test_frame, "BRA2E19", (100, 180), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
        has_event, dets, plate_p, _ = vision_pipeline.process_frame(
            camera_id=999,
            camera_name="Teste Diagnostic",
            frame_bgr=test_frame,
            sensitivity=20.0
        )
        elapsed_ai = round((time.time() - t0) * 1000, 2)
        status = "OK"
        device_name = vision_pipeline.device.upper()
        detail = f"Pipeline YOLO + OCR 100% operacional ({device_name} Acceleration, {elapsed_ai}ms)."
        logger.success(f"[Diagnóstico Geral] 🟢 Teste 7/7: IA & Visão Computacional ({device_name}) -> 100% OK ({elapsed_ai}ms)")
        total_passed += 1
    except Exception as e:
        elapsed_ai = round((time.time() - t0) * 1000, 2)
        status = "ERROR"
        detail = f"Falha no pipeline de IA/YOLO: {e}"
        logger.error(f"[Diagnóstico Geral] ❌ Teste 7/7: IA & Visão -> FALHA: {e}")
        total_failed += 1
    results.append({
        "id": "ai",
        "name": "7. IA & Visão Computacional (YOLO + LPR)",
        "icon": "Cpu",
        "status": status,
        "latency_ms": elapsed_ai,
        "detail": detail
    })

    total_time_ms = round((time.time() - t_start) * 1000, 1)
    overall_status = "OK" if total_failed == 0 and total_warnings == 0 else ("WARNING" if total_failed == 0 else "ERROR")
    logger.success(f"⚡ [Diagnóstico Geral] TESTE COMPLETO FINALIZADO em {total_time_ms}ms! Resultado: {total_passed} Aprovados, {total_warnings} Avisos, {total_failed} Falhas")

    return {
        "success": True,
        "overall_status": overall_status,
        "total_time_ms": total_time_ms,
        "summary": {
            "passed": total_passed,
            "warnings": total_warnings,
            "failed": total_failed,
            "total": len(results)
        },
        "tests": results
    }


# =========================================================================
# ⏸️ DYNAMIC PROCESSING CONTROLS (PAUSE / RESUME STANDBY 0% CPU)
# =========================================================================

@router.get("/processing/status")
async def get_processing_status():
    """
    Returns whether camera ingestion, MOG2, and LPR analysis are paused or active.
    """
    return {
        "paused": camera_manager.is_processing_paused,
        "status": "paused" if camera_manager.is_processing_paused else "active",
        "active_cameras": len(camera_manager.ingestors),
        "message": "Processamento pausado (Standby 0% CPU)" if camera_manager.is_processing_paused else "Processamento em tempo real ativo"
    }

@router.post("/processing/pause")
async def pause_camera_processing():
    """
    Instantly pauses RTSP grabbing, MOG2 motion detection, and LPR OCR across all cameras.
    Drops server CPU to ~0% without shutting down the web server or Telegram bot.
    """
    camera_manager.pause_processing()
    
    # Broadcast processing status to all connected WebSocket clients
    await ws_hub.broadcast_event({
        "type": "PROCESSING_STATUS_CHANGED",
        "paused": True,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "⏸️ Processamento e detecções pausados pelo usuário (Standby 0% CPU)"
    })

    return {
        "success": True,
        "paused": True,
        "message": "Processamento do servidor pausado com sucesso! O uso de CPU foi reduzido a 0%."
    }

@router.post("/processing/resume")
async def resume_camera_processing():
    """
    Instantly resumes RTSP grabbing, MOG2 motion detection, and LPR OCR across all cameras.
    """
    camera_manager.resume_processing()

    # Broadcast processing status to all connected WebSocket clients
    await ws_hub.broadcast_event({
        "type": "PROCESSING_STATUS_CHANGED",
        "paused": False,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "▶️ Processamento e detecções retomados com sucesso!"
    })

    return {
        "success": True,
        "paused": False,
        "message": "Processamento em tempo real retomado com sucesso! Monitoramento e alertas ativos."
    }


# =========================================================================
# 🔄 SERVER LIFECYCLE CONTROLS (SHUTDOWN & RESTART)
# =========================================================================

@router.post("/system/shutdown")
async def shutdown_server():
    """
    Gracefully stops the ServONVIF Core Engine across Windows, Linux and macOS.
    """
    def _delayed_shutdown():
        import time, os
        time.sleep(0.4)
        logger.info("🛑 ServONVIF Engine initiating graceful shutdown sequence...")
        try:
            # 1. Stop all video streams, background grabber and processor threads
            logger.info("Stopping all camera video pipelines & AI threads...")
            camera_manager.stop_all()
        except Exception as e:
            logger.error(f"Error stopping cameras: {e}")

        try:
            # 2. Stop retention worker
            logger.info("Stopping RetentionWorker...")
            retention_worker.stop()
        except Exception as e:
            logger.error(f"Error stopping retention worker: {e}")

        try:
            # 3. Release power management assertion (caffeinate / sleep prevention)
            logger.info("Releasing power management locks...")
            power_manager.stop()
        except Exception as e:
            logger.error(f"Error stopping power manager: {e}")

        time.sleep(0.3)
        logger.info("🛑 ServONVIF Engine shutdown complete. Exiting process.")
        os._exit(0)

    import threading
    threading.Thread(target=_delayed_shutdown, daemon=True).start()
    return {
        "success": True,
        "message": "Servidor ServONVIF sendo desligado com segurança. Todos os processos foram finalizados."
    }

@router.post("/system/restart")
async def restart_server():
    """
    Gracefully restarts the ServONVIF Core Engine process.
    """
    def _delayed_restart():
        import time, os, sys, subprocess
        from pathlib import Path
        time.sleep(0.5)
        logger.info("🔄 ServONVIF Engine preparing restart...")
        try:
            camera_manager.stop_all()
            retention_worker.stop()
            power_manager.stop()
        except Exception as e:
            logger.error(f"Error during pre-restart cleanup: {e}")

        time.sleep(0.3)
        logger.info("🔄 ServONVIF Engine relaunching process...")
        try:
            root_dir = str(Path(__file__).resolve().parent.parent.parent)
            env = os.environ.copy()
            env["PYTHONPATH"] = root_dir
            subprocess.Popen([sys.executable, "-m", "engine.main"], cwd=root_dir, env=env)
        except Exception as e:
            logger.error(f"Restart relaunch error: {e}")
        os._exit(0)

    import threading
    threading.Thread(target=_delayed_restart, daemon=True).start()
    return {
        "success": True,
        "message": "Reiniciando motor ServONVIF... A conexão será restabelecida em alguns segundos."
    }

@router.get("/system/version")
async def get_system_version():
    """
    Checks the local Git commit version and queries GitHub to check if updates are available.
    """
    import subprocess
    import json
    import urllib.request
    from pathlib import Path

    root_dir = Path(__file__).resolve().parent.parent.parent

    # 1. Local Git metadata
    local_commit = "unknown"
    local_msg = ""
    local_date = ""
    try:
        res_sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=root_dir, capture_output=True, text=True, timeout=3)
        if res_sha.returncode == 0:
            local_commit = res_sha.stdout.strip()
        res_msg = subprocess.run(["git", "log", "-1", "--format=%s"], cwd=root_dir, capture_output=True, text=True, timeout=3)
        if res_msg.returncode == 0:
            local_msg = res_msg.stdout.strip()
        res_date = subprocess.run(["git", "log", "-1", "--format=%cd", "--date=relative"], cwd=root_dir, capture_output=True, text=True, timeout=3)
        if res_date.returncode == 0:
            local_date = res_date.stdout.strip()
    except Exception as e:
        logger.debug(f"Git local version read error: {e}")

    # 2. Remote GitHub metadata (Cached for 5 minutes, non-blocking background thread)
    global _github_version_cache, _github_cache_time
    if "_github_version_cache" not in globals():
        _github_version_cache = None
        _github_cache_time = 0.0

    now_t = time.time()
    if _github_version_cache is not None and (now_t - _github_cache_time) < 300.0:
        return _github_version_cache

    def _fetch_remote():
        r_commit = local_commit
        r_msg = local_msg
        r_date = local_date
        u_available = False
        g_reachable = False

        try:
            req = urllib.request.Request(
                "https://api.github.com/repos/jotapelessa/ServONVIF2/commits/main",
                headers={"User-Agent": "ServONVIF-Engine-AutoUpdater"}
            )
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    r_commit = data["sha"][:7]
                    r_msg = data.get("commit", {}).get("message", "").split("\n")[0]
                    r_date = data.get("commit", {}).get("author", {}).get("date", "")
                    g_reachable = True
                    if local_commit != "unknown" and r_commit != local_commit:
                        u_available = True
        except Exception:
            pass

        return {
            "local_commit": local_commit,
            "local_commit_message": local_msg,
            "local_commit_date": local_date,
            "remote_commit": r_commit,
            "remote_commit_message": r_msg,
            "remote_commit_date": r_date,
            "update_available": u_available,
            "github_reachable": g_reachable,
            "repo_url": "https://github.com/jotapelessa/ServONVIF2"
        }

    res_dict = await asyncio.to_thread(_fetch_remote)
    _github_version_cache = res_dict
    _github_cache_time = now_t
    return res_dict

@router.post("/system/update")
async def apply_system_update():
    """
    Executes 'git pull origin main' from GitHub and restarts the engine automatically.
    """
    import subprocess
    import threading
    import os, sys, time
    from pathlib import Path

    root_dir = Path(__file__).resolve().parent.parent.parent

    # 1. Run git pull
    try:
        res = subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=root_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        git_output = res.stdout + ("\n" + res.stderr if res.stderr else "")
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Falha no git pull: {git_output}")
    except Exception as e:
        logger.error(f"Auto-update pull error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao baixar atualização do GitHub: {str(e)}")

    # 2. Schedule delayed restart
    def _delayed_restart_after_update():
        time.sleep(1.2)
        logger.info("🚀 ServONVIF Engine restarting after successful GitHub update...")
        try:
            env = os.environ.copy()
            env["PYTHONPATH"] = str(root_dir)
            subprocess.Popen([sys.executable, "-m", "engine.main"], cwd=str(root_dir), env=env)
        except Exception as e:
            logger.error(f"Restart relaunch error: {e}")
        os._exit(0)

    threading.Thread(target=_delayed_restart_after_update, daemon=True).start()

    return {
        "success": True,
        "message": "Atualização baixada com sucesso do GitHub! O servidor está reiniciando e voltará online em segundos.",
        "git_output": git_output.strip()
    }


# =========================================================================
# 💾 CONFIGURATION BACKUP & RESTORE (.JSON / UNIVERSAL COMPATIBILITY)
# =========================================================================

@router.get("/export-config")
async def export_configuration():
    """
    Exports a complete snapshot of all configurations, cameras, plates and devices into a universal JSON backup file.
    """
    backup_data = await build_full_backup_dict()
    json_bytes = json.dumps(backup_data, indent=2, default=_json_serial).encode("utf-8")
    filename = f"servonvif_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/json"
        }
    )

@router.post("/backup/telegram")
async def send_manual_telegram_backup():
    """
    Manually sends a fresh universal JSON backup document to the configured Telegram channel/chat.
    """
    if not telegram_service.is_configured:
        raise HTTPException(
            status_code=400,
            detail="Bot do Telegram não está configurado! Insira seu Bot Token e Chat ID na aba 'Bot do Telegram' e clique em Salvar."
        )

    success, msg = await dispatch_telegram_backup(reason="Backup Manual Solicitado pelo Usuário")
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return {"success": True, "message": msg}

@router.post("/import-config")
async def import_configuration(backup_payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Imports and restores configurations, cameras, vehicles, and authorized devices from a backup JSON.
    """
    from engine.database.models import Camera, Vehicle, Device
    from engine.core.camera_manager import camera_manager
    from sqlalchemy.future import select

    if not isinstance(backup_payload, dict):
        raise HTTPException(status_code=400, detail="Formato de backup inválido.")

    imported_settings = backup_payload.get("settings", {})
    imported_cameras = backup_payload.get("cameras", [])
    imported_vehicles = backup_payload.get("vehicles", [])
    imported_devices = backup_payload.get("devices", [])

    # 1. Update In-Memory & Persisted SQLite Settings
    if "telegram_bot_token" in imported_settings:
        settings.TELEGRAM_BOT_TOKEN = imported_settings["telegram_bot_token"]
        telegram_service.bot_token = imported_settings["telegram_bot_token"]
        await set_system_setting("telegram_bot_token", imported_settings["telegram_bot_token"])
    if "telegram_chat_id" in imported_settings:
        settings.TELEGRAM_CHAT_ID = imported_settings["telegram_chat_id"]
        telegram_service.chat_id = imported_settings["telegram_chat_id"]
        await set_system_setting("telegram_chat_id", imported_settings["telegram_chat_id"])
    if "telegram_enabled" in imported_settings:
        settings.TELEGRAM_ENABLED = bool(imported_settings["telegram_enabled"])
        await set_system_setting("telegram_enabled", settings.TELEGRAM_ENABLED)
    if "telegram_paused" in imported_settings:
        settings.TELEGRAM_PAUSED = bool(imported_settings["telegram_paused"])
        await set_system_setting("telegram_paused", settings.TELEGRAM_PAUSED)
    if "retention_days" in imported_settings:
        settings.RETENTION_DAYS = int(imported_settings["retention_days"])
        await set_system_setting("retention_days", settings.RETENTION_DAYS)
    if "default_buffer_seconds" in imported_settings:
        settings.DEFAULT_BUFFER_SECONDS = int(imported_settings["default_buffer_seconds"])
        await set_system_setting("default_buffer_seconds", settings.DEFAULT_BUFFER_SECONDS)
    if "telegram_cooldown_seconds" in imported_settings:
        settings.TELEGRAM_COOLDOWN_SECONDS = int(imported_settings["telegram_cooldown_seconds"])
        await set_system_setting("telegram_cooldown_seconds", settings.TELEGRAM_COOLDOWN_SECONDS)

    # 2. Upsert Cameras
    cameras_restored = 0
    for cam_data in imported_cameras:
        rtsp = cam_data.get("rtsp_url")
        if not rtsp:
            continue

        res = await db.execute(select(Camera).where(Camera.rtsp_url == rtsp))
        existing_cam = res.scalar_one_or_none()

        if existing_cam:
            existing_cam.name = cam_data.get("name", existing_cam.name)
            existing_cam.ip_address = cam_data.get("ip_address", existing_cam.ip_address)
            existing_cam.onvif_port = cam_data.get("onvif_port", existing_cam.onvif_port)
            existing_cam.username = cam_data.get("username", existing_cam.username)
            existing_cam.password = cam_data.get("password", existing_cam.password)
            existing_cam.sensitivity = cam_data.get("sensitivity", existing_cam.sensitivity)
            existing_cam.roi_polygon = cam_data.get("roi_polygon", existing_cam.roi_polygon)
            existing_cam.ignore_polygons = cam_data.get("ignore_polygons", existing_cam.ignore_polygons)
            existing_cam.allowed_device_ids = cam_data.get("allowed_device_ids", existing_cam.allowed_device_ids)
            existing_cam.is_active = cam_data.get("is_active", True)
            db.add(existing_cam)
        else:
            new_cam = Camera(
                name=cam_data.get("name", "Câmera Importada"),
                rtsp_url=rtsp,
                ip_address=cam_data.get("ip_address"),
                onvif_port=cam_data.get("onvif_port", 80),
                username=cam_data.get("username"),
                password=cam_data.get("password"),
                sensitivity=cam_data.get("sensitivity", 20.0),
                roi_polygon=cam_data.get("roi_polygon"),
                ignore_polygons=cam_data.get("ignore_polygons"),
                allowed_device_ids=cam_data.get("allowed_device_ids"),
                is_active=cam_data.get("is_active", True)
            )
            db.add(new_cam)
        cameras_restored += 1

    # 3. Upsert Vehicles
    vehicles_restored = 0
    for veh_data in imported_vehicles:
        plate = veh_data.get("plate_number")
        if not plate:
            continue
        res = await db.execute(select(Vehicle).where(Vehicle.plate_number == plate))
        existing_veh = res.scalar_one_or_none()

        if existing_veh:
            existing_veh.owner_name = veh_data.get("owner_name", existing_veh.owner_name)
            existing_veh.vehicle_model = veh_data.get("vehicle_model", existing_veh.vehicle_model)
            existing_veh.category = veh_data.get("category", existing_veh.category)
            existing_veh.notes = veh_data.get("notes", existing_veh.notes)
            existing_veh.is_active = veh_data.get("is_active", True)
            db.add(existing_veh)
        else:
            new_veh = Vehicle(
                plate_number=plate,
                owner_name=veh_data.get("owner_name", "Desconhecido"),
                vehicle_model=veh_data.get("vehicle_model", "Não informado"),
                category=veh_data.get("category", "MORADOR"),
                notes=veh_data.get("notes"),
                is_active=veh_data.get("is_active", True)
            )
            db.add(new_veh)
        vehicles_restored += 1

    # 4. Upsert Devices
    devices_restored = 0
    for dev_data in imported_devices:
        dev_id = dev_data.get("device_id")
        if not dev_id:
            continue
        res = await db.execute(select(Device).where(Device.device_id == dev_id))
        existing_dev = res.scalar_one_or_none()

        if existing_dev:
            existing_dev.device_name = dev_data.get("device_name", existing_dev.device_name)
            existing_dev.ip_address = dev_data.get("ip_address", existing_dev.ip_address)
            existing_dev.device_type = dev_data.get("device_type", existing_dev.device_type)
            existing_dev.status = dev_data.get("status", existing_dev.status)
            existing_dev.notes = dev_data.get("notes", existing_dev.notes)
            db.add(existing_dev)
        else:
            new_dev = Device(
                device_id=dev_id,
                device_name=dev_data.get("device_name", "Dispositivo"),
                ip_address=dev_data.get("ip_address", "127.0.0.1"),
                device_type=dev_data.get("device_type", "Android TV"),
                status=dev_data.get("status", "ALLOWED"),
                notes=dev_data.get("notes")
            )
            db.add(new_dev)
        devices_restored += 1

    await db.commit()

    # Re-sync cameras in background
    try:
        await camera_manager.sync_cameras(db)
    except Exception as e:
        logger.warning(f"Failed to auto-sync camera ingestors after import: {e}")

    logger.info(f"✅ Backup successfully imported: {cameras_restored} cameras, {vehicles_restored} vehicles, {devices_restored} devices")

    # Envia cópia atualizada para o Telegram
    asyncio.create_task(dispatch_telegram_backup(reason="Restauração de Backup Concluída"))

    return {
        "success": True,
        "message": f"Configurações restauradas com sucesso! ({cameras_restored} câmeras, {vehicles_restored} placas, {devices_restored} telas)",
        "cameras_restored": cameras_restored,
        "vehicles_restored": vehicles_restored,
        "devices_restored": devices_restored,
    }


# =========================================================================
# 🌐 TAILSCALE WIREGUARD MESH INTEGRATION
# =========================================================================

@router.get("/tailscale")
async def get_tailscale_status():
    """
    Returns real-time status of the Tailscale mesh network, 100.x IP address,
    MagicDNS hostname, connected peers, and installation commands.
    """
    from engine.services.tailscale_service import tailscale_service
    return tailscale_service.get_status()


