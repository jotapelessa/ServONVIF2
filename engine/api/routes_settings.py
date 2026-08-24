import io
import socket
import os
import json
import asyncio
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
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
    default_buffer_seconds: Optional[int] = None

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

    if payload.retention_days is not None:
        settings.RETENTION_DAYS = payload.retention_days
        await set_system_setting("retention_days", payload.retention_days)

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

@router.post("/cleanup")
async def trigger_manual_cleanup():
    deleted_count = await retention_worker.cleanup_old_media()
    return {"message": f"Limpeza concluída com sucesso. {deleted_count} itens antigos processados."}

@router.get("/qr-pairing")
async def get_pairing_qr_code():
    local_ip = get_local_ip()
    img = np.full((260, 420, 3), 20, dtype=np.uint8)
    cv2.putText(img, "ServONVIF Android TV Pairing", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
    cv2.putText(img, f"Host: {local_ip}:{settings.PORT}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 120), 1)
    cv2.putText(img, f"WS: ws://{local_ip}:{settings.PORT}/ws/events", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)
    cv2.putText(img, "Status: Monitor Ativo (PiP Habilitado)", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1)
    cv2.putText(img, "Digite o IP no aplicativo para parear", (20, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

    _, png = cv2.imencode('.png', img)
    return Response(content=png.tobytes(), media_type="image/png")

# ================= DIAGNOSTICS & SYSTEM CONTROL ENDPOINTS =================

@router.get("/diagnostics/logs")
async def get_system_logs(limit: int = 100, level: str = "ALL"):
    """
    Returns structured logs and pre-formatted Markdown for 1-click clipboard reporting to Antigravity.
    """
    from engine.core.camera_manager import camera_manager
    local_ip = get_local_ip()
    logs = log_buffer.get_logs(limit=limit, level_filter=level)
    
    active_cams = [
        {"id": cid, "name": ing.camera.name, "rtsp": ing.camera.rtsp_url, "running": ing.is_running}
        for cid, ing in camera_manager.ingestors.items()
    ]

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
            status_emoji = "🟢" if c["running"] else "🔴"
            lines.append(f"  • {status_emoji} ID #{c['id']} - `{c['name']}` ({c['rtsp']})")
    else:
        lines.append("  • Nenhuma câmera ativa no momento")

    lines.append(f"- **Armazenamento de Vídeos:** {storage['total_files']} arquivos ({storage['total_size_mb']} MB)")
    lines.append("\n#### 📋 Registros de Log Recentes:")
    lines.append("```text")
    for log in logs[-80:]:
        lines.append(f"[{log['timestamp']}] [{log['level']}] {log['module']}:{log['function']}:{log['line']} - {log['message']}")
    lines.append("```")

    markdown_report = "\n".join(lines)

    return {
        "summary": {
            "local_ip": local_ip,
            "port": settings.PORT,
            "connected_ws_clients": total_ws,
            "active_cameras_count": len(active_cams),
            "storage": storage,
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
            logger.info(f"RTSP Connection Test SUCCESS for {host}:{port} ({latency_ms}ms)")
            return {
                "success": True,
                "latency_ms": latency_ms,
                "message": f"Conexão bem-sucedida com {host}:{port}! Respondeu em {latency_ms}ms."
            }
        else:
            logger.warning(f"RTSP Connection Test FAILED for {host}:{port} (code {res})")
            return {
                "success": False,
                "latency_ms": latency_ms,
                "message": f"Falha ao conectar na porta {port} do IP {host} (código de erro {res})."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exceção de rede: {e}")


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
        time.sleep(0.6)
        logger.info("🛑 ServONVIF Engine shutting down cleanly by user request...")
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
        time.sleep(0.8)
        logger.info("🔄 ServONVIF Engine restarting...")
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

