from pathlib import Path
from pydantic_settings import BaseSettings
from engine.config.version import APP_VERSION

class Settings(BaseSettings):
    # App
    APP_NAME: str = "ServONVIF Core Engine"
    VERSION: str = APP_VERSION
    DEBUG: bool = False
    PORT: int = 8080
    HOST: str = "0.0.0.0"

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    MEDIA_DIR: Path = DATA_DIR / "media"
    DB_PATH: Path = DATA_DIR / "servonvif.db"

    # Retention
    RETENTION_DAYS: int = 7

    # Motion Detection Defaults
    DEFAULT_BUFFER_SECONDS: int = 10
    PRE_EVENT_SECONDS: int = 3
    POST_EVENT_SECONDS: int = 5
    SMALL_FRAME_WIDTH: int = 640
    SMALL_FRAME_HEIGHT: int = 360

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    TELEGRAM_ENABLED: bool = False
    TELEGRAM_PAUSED: bool = False
    TELEGRAM_COOLDOWN_SECONDS: int = 10
    TELEGRAM_VIDEO_DURATION_SECONDS: int = 10
    TELEGRAM_PHOTO_QUALITY: str = "media"  # "minima", "media", "maxima"
    TELEGRAM_DISPATCH_MODE: str = "all"  # "all", "photo_only", "video_only"
    TELEGRAM_INCLUDE_PREBUFFER: bool = True
    TELEGRAM_WATERMARK_ENABLED: bool = True

    # LPR & Vehicle Recognition
    LPR_ENABLED: bool = True
    LPR_MIN_CONFIDENCE: float = 0.70
    LPR_NOTIFY_TELEGRAM: bool = True
    LPR_NOTIFY_TV: bool = True
    LPR_ALARM_ON_BLOCKED: bool = True
    LPR_MOTORCYCLE_ENABLED: bool = True
    LPR_COOLDOWN_SECONDS: int = 30

    # Security
    JWT_SECRET: str = "change_me_in_production_super_secret_key"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
