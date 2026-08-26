from datetime import datetime
from typing import AsyncGenerator, Optional, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlmodel import SQLModel, select
from loguru import logger
from engine.config.settings import settings

DATABASE_URL = f"sqlite+aiosqlite:///{settings.DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args={"check_same_thread": False}
)

async_session_factory = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        for col_def in [
            "ALTER TABLE devices ADD COLUMN manufacturer_model VARCHAR",
            "ALTER TABLE devices ADD COLUMN ping_count INTEGER DEFAULT 0",
            "ALTER TABLE devices ADD COLUMN last_ping_at DATETIME",
            "ALTER TABLE devices ADD COLUMN mac_address VARCHAR",
            "ALTER TABLE devices ADD COLUMN hardware_fingerprint VARCHAR",
            "ALTER TABLE devices ADD COLUMN app_version VARCHAR",
            "ALTER TABLE cameras ADD COLUMN allowed_device_ids JSON",
            "ALTER TABLE cameras ADD COLUMN ignore_polygons JSON",
            "ALTER TABLE events ADD COLUMN file_size_bytes INTEGER",
            "ALTER TABLE events ADD COLUMN file_size_formatted VARCHAR",
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception:
                pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_system_setting(key: str, default: Any = None) -> Optional[str]:
    from engine.database.models import SystemSetting
    async with async_session_factory() as session:
        result = await session.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalars().first()
        return setting.value if setting and setting.value is not None else default

async def set_system_setting(key: str, value: Any) -> None:
    from engine.database.models import SystemSetting
    str_val = "" if value is None else str(value)
    if isinstance(value, bool):
        str_val = "true" if value else "false"

    async with async_session_factory() as session:
        result = await session.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalars().first()
        if setting:
            setting.value = str_val
            setting.updated_at = datetime.utcnow()
        else:
            setting = SystemSetting(key=key, value=str_val, updated_at=datetime.utcnow())
            session.add(setting)
        await session.commit()

async def load_persisted_system_settings() -> None:
    """Carrega todas as configurações persistidas do SQLite para as variáveis de runtime e serviços."""
    try:
        from engine.database.models import SystemSetting
        async with async_session_factory() as session:
            result = await session.execute(select(SystemSetting))
            all_settings = {s.key: s.value for s in result.scalars().all()}

            if "telegram_bot_token" in all_settings:
                settings.TELEGRAM_BOT_TOKEN = all_settings["telegram_bot_token"] or ""
            if "telegram_chat_id" in all_settings:
                settings.TELEGRAM_CHAT_ID = all_settings["telegram_chat_id"] or ""
            if "telegram_enabled" in all_settings and all_settings["telegram_enabled"] is not None:
                settings.TELEGRAM_ENABLED = all_settings["telegram_enabled"].lower() == "true"
            if "telegram_paused" in all_settings and all_settings["telegram_paused"] is not None:
                settings.TELEGRAM_PAUSED = all_settings["telegram_paused"].lower() == "true"
            if "telegram_cooldown_seconds" in all_settings and all_settings["telegram_cooldown_seconds"]:
                try:
                    settings.TELEGRAM_COOLDOWN_SECONDS = int(all_settings["telegram_cooldown_seconds"])
                except Exception:
                    pass
            if "telegram_video_duration_seconds" in all_settings and all_settings["telegram_video_duration_seconds"]:
                try:
                    settings.TELEGRAM_VIDEO_DURATION_SECONDS = int(all_settings["telegram_video_duration_seconds"])
                except Exception:
                    pass
            if "telegram_photo_quality" in all_settings and all_settings["telegram_photo_quality"]:
                settings.TELEGRAM_PHOTO_QUALITY = str(all_settings["telegram_photo_quality"])
            if "telegram_dispatch_mode" in all_settings and all_settings["telegram_dispatch_mode"]:
                settings.TELEGRAM_DISPATCH_MODE = str(all_settings["telegram_dispatch_mode"])
            if "telegram_include_prebuffer" in all_settings and all_settings["telegram_include_prebuffer"] is not None:
                settings.TELEGRAM_INCLUDE_PREBUFFER = all_settings["telegram_include_prebuffer"].lower() == "true"
            if "telegram_watermark_enabled" in all_settings and all_settings["telegram_watermark_enabled"] is not None:
                settings.TELEGRAM_WATERMARK_ENABLED = all_settings["telegram_watermark_enabled"].lower() == "true"
            if "retention_days" in all_settings and all_settings["retention_days"]:
                try:
                    settings.RETENTION_DAYS = int(all_settings["retention_days"])
                except Exception:
                    pass
            if "default_buffer_seconds" in all_settings and all_settings["default_buffer_seconds"]:
                try:
                    settings.DEFAULT_BUFFER_SECONDS = int(all_settings["default_buffer_seconds"])
                except Exception:
                    pass
            if "lpr_enabled" in all_settings and all_settings["lpr_enabled"] is not None:
                settings.LPR_ENABLED = all_settings["lpr_enabled"].lower() == "true"
            if "lpr_min_confidence" in all_settings and all_settings["lpr_min_confidence"]:
                try:
                    settings.LPR_MIN_CONFIDENCE = float(all_settings["lpr_min_confidence"])
                except Exception:
                    pass
            if "lpr_notify_telegram" in all_settings and all_settings["lpr_notify_telegram"] is not None:
                settings.LPR_NOTIFY_TELEGRAM = all_settings["lpr_notify_telegram"].lower() == "true"
            if "lpr_notify_tv" in all_settings and all_settings["lpr_notify_tv"] is not None:
                settings.LPR_NOTIFY_TV = all_settings["lpr_notify_tv"].lower() == "true"
            if "lpr_alarm_on_blocked" in all_settings and all_settings["lpr_alarm_on_blocked"] is not None:
                settings.LPR_ALARM_ON_BLOCKED = all_settings["lpr_alarm_on_blocked"].lower() == "true"
            if "lpr_motorcycle_enabled" in all_settings and all_settings["lpr_motorcycle_enabled"] is not None:
                settings.LPR_MOTORCYCLE_ENABLED = all_settings["lpr_motorcycle_enabled"].lower() == "true"
            if "lpr_cooldown_seconds" in all_settings and all_settings["lpr_cooldown_seconds"]:
                try:
                    settings.LPR_COOLDOWN_SECONDS = int(all_settings["lpr_cooldown_seconds"])
                except Exception:
                    pass

            # Sync com o serviço do telegram
            from engine.services.telegram_bot import telegram_service
            telegram_service.bot_token = settings.TELEGRAM_BOT_TOKEN
            telegram_service.chat_id = settings.TELEGRAM_CHAT_ID
            if telegram_service.bot_token:
                telegram_service.base_url = f"https://api.telegram.org/bot{telegram_service.bot_token}"

            logger.info(f"✅ Configurações persistidas carregadas com sucesso! (Telegram Token={'Configurado' if telegram_service.bot_token else 'Vazio'}, Pausado={settings.TELEGRAM_PAUSED}, Retenção={settings.RETENTION_DAYS}d, Buffer={settings.DEFAULT_BUFFER_SECONDS}s, LPR={settings.LPR_ENABLED})")
    except Exception as e:
        logger.error(f"Erro ao carregar configurações persistidas do SQLite: {e}")
