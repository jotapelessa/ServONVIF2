import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.future import select
from loguru import logger
from engine.config.settings import settings
from engine.database.db import async_session_factory
from engine.database.models import Camera, Vehicle, Device
from engine.services.telegram_bot import telegram_service

def _json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

async def build_full_backup_dict() -> Dict[str, Any]:
    """Gera um dicionário completo e universal de backup com 100% dos dados do sistema."""
    async with async_session_factory() as session:
        cam_res = await session.execute(select(Camera))
        cameras = [c.model_dump() for c in cam_res.scalars().all()]

        veh_res = await session.execute(select(Vehicle))
        vehicles = [v.model_dump() for v in veh_res.scalars().all()]

        dev_res = await session.execute(select(Device))
        devices = [d.model_dump() for d in dev_res.scalars().all()]

    return {
        "format": "SERVONVIF_BACKUP",
        "version": settings.VERSION,
        "exported_at": datetime.utcnow().isoformat(),
        "settings": {
            "retention_days": settings.RETENTION_DAYS,
            "default_buffer_seconds": settings.DEFAULT_BUFFER_SECONDS,
            "telegram_enabled": settings.TELEGRAM_ENABLED,
            "telegram_paused": settings.TELEGRAM_PAUSED,
            "telegram_bot_token": settings.TELEGRAM_BOT_TOKEN or "",
            "telegram_chat_id": settings.TELEGRAM_CHAT_ID or "",
            "telegram_cooldown_seconds": settings.TELEGRAM_COOLDOWN_SECONDS,
        },
        "cameras": cameras,
        "vehicles": vehicles,
        "devices": devices,
    }

async def dispatch_telegram_backup(reason: str = "Alteração de Configurações") -> tuple[bool, str]:
    """Gera o JSON mais recente e despacha automaticamente para o Telegram."""
    if not telegram_service.is_configured:
        return False, "Bot do Telegram não configurado."

    try:
        backup_dict = await build_full_backup_dict()
        json_str = json.dumps(backup_dict, indent=2, default=_json_serial)
        json_bytes = json_str.encode("utf-8")
        filename = f"servonvif_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

        return await telegram_service.send_backup_document(
            json_bytes=json_bytes,
            filename=filename,
            reason=reason
        )
    except Exception as e:
        logger.error(f"Erro ao gerar e despachar backup para o Telegram: {e}")
        return False, f"Erro interno ao gerar backup: {str(e)}"
