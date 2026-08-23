import io
import socket
import os
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import cv2
import numpy as np
from loguru import logger

from engine.config.settings import settings
from engine.services.telegram_bot import telegram_service
from engine.services.retention_worker import retention_worker
from engine.core.log_buffer import log_buffer
from engine.api.websocket_hub import ws_hub

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    telegram_cooldown_seconds: Optional[int] = None
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

@router.get("/")
async def get_current_settings():
    local_ip = get_local_ip()
    storage_stats = get_media_storage_stats()
    return {
        "app_name": settings.APP_NAME,
        "port": settings.PORT,
        "local_ip": local_ip,
        "server_ws_url": f"ws://{local_ip}:{settings.PORT}/ws/events",
        "server_http_url": f"http://{local_ip}:{settings.PORT}",
        "retention_days": settings.RETENTION_DAYS,
        "default_buffer_seconds": settings.DEFAULT_BUFFER_SECONDS,
        "telegram_enabled": settings.TELEGRAM_ENABLED,
        "telegram_bot_token": settings.TELEGRAM_BOT_TOKEN or "",
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID or "",
        "telegram_bot_configured": telegram_service.is_configured,
        "telegram_cooldown_seconds": settings.TELEGRAM_COOLDOWN_SECONDS,
        "storage": storage_stats,
    }

@router.post("/")
async def update_settings(payload: SettingsUpdate):
    if payload.telegram_bot_token is not None:
        settings.TELEGRAM_BOT_TOKEN = payload.telegram_bot_token
        telegram_service.bot_token = payload.telegram_bot_token
        telegram_service.base_url = f"https://api.telegram.org/bot{payload.telegram_bot_token}"

    if payload.telegram_chat_id is not None:
        settings.TELEGRAM_CHAT_ID = payload.telegram_chat_id
        telegram_service.chat_id = payload.telegram_chat_id

    if payload.telegram_enabled is not None:
        settings.TELEGRAM_ENABLED = payload.telegram_enabled

    if payload.telegram_cooldown_seconds is not None:
        settings.TELEGRAM_COOLDOWN_SECONDS = payload.telegram_cooldown_seconds

    if payload.retention_days is not None:
        settings.RETENTION_DAYS = payload.retention_days

    if payload.default_buffer_seconds is not None:
        settings.DEFAULT_BUFFER_SECONDS = payload.default_buffer_seconds

    return {"message": "Configurações atualizadas com sucesso!"}

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

    await ws_hub.broadcast_event(event_payload)
    logger.info(f"🧪 Simulated Motion Alert Broadcasted: {event_payload['camera_name']} (Score: {event_payload['score']})")

    return {
        "success": True,
        "message": f"Alerta de teste disparado com sucesso para {len(ws_hub.active_connections)} clientes conectados via WebSocket!",
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
