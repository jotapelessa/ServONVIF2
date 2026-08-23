import io
import socket
import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import cv2
import numpy as np

from engine.config.settings import settings
from engine.services.telegram_bot import telegram_service
from engine.services.retention_worker import retention_worker

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

def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.254.254.254', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

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
