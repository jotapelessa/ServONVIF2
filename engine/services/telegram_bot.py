import asyncio
import time
from pathlib import Path
from typing import Optional
import httpx
from loguru import logger
from engine.config.settings import settings

class TelegramService:
    """
    Asynchronous Telegram Bot notification client using official Telegram Bot HTTP API.
    Includes rate-limiting and cooldown to avoid Telegram API bans.
    """
    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token or settings.TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or settings.TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self._last_sent_per_camera: dict[int, float] = {}

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def can_send_for_camera(self, camera_id: int, cooldown_seconds: Optional[int] = None) -> bool:
        cooldown = cooldown_seconds or settings.TELEGRAM_COOLDOWN_SECONDS
        now = time.time()
        last = self._last_sent_per_camera.get(camera_id, 0.0)
        return (now - last) >= cooldown

    def mark_sent(self, camera_id: int) -> None:
        self._last_sent_per_camera[camera_id] = time.time()

    async def send_photo_alert(
        self,
        camera_id: int,
        camera_name: str,
        timestamp_str: str,
        photo_path: str,
        score: float
    ) -> bool:
        if not self.is_configured:
            logger.debug("Telegram is not configured. Skipping alert.")
            return False

        if not self.can_send_for_camera(camera_id):
            logger.debug(f"Telegram alert for camera {camera_id} suppressed by cooldown.")
            return False

        path_obj = Path(photo_path)
        if not path_obj.exists():
            logger.error(f"Thumbnail not found: {photo_path}")
            return False

        caption = (
            f"🚨 *ALERTA DE MOVIMENTO*\n"
            f"📹 **Câmera:** {camera_name}\n"
            f"⏰ **Horário:** {timestamp_str}\n"
            f"📊 **Intensidade:** {score * 100:.1f}%\n"
        )

        url = f"{self.base_url}/sendPhoto"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"photo": (path_obj.name, f, "image/jpeg")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption,
                        "parse_mode": "Markdown"
                    }
                    response = await client.post(url, data=data, files=files)
                    if response.status_code == 200:
                        logger.info(f"Telegram photo sent successfully for camera {camera_id}")
                        self.mark_sent(camera_id)
                        return True
                    else:
                        logger.warning(f"Telegram API returned status {response.status_code}: {response.text}")
                        return False
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")
            return False

    async def send_video_clip(
        self,
        camera_id: int,
        camera_name: str,
        video_path: str
    ) -> bool:
        if not self.is_configured:
            return False

        path_obj = Path(video_path)
        if not path_obj.exists():
            return False

        url = f"{self.base_url}/sendVideo"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"video": (path_obj.name, f, "video/mp4")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": f"🎥 Clipe do evento - {camera_name}"
                    }
                    response = await client.post(url, data=data, files=files)
                    return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send Telegram video: {e}")
            return False

    async def send_test_message(self, custom_token: Optional[str] = None, custom_chat_id: Optional[str] = None) -> tuple[bool, str]:
        token = custom_token or self.bot_token
        chat_id = custom_chat_id or self.chat_id
        if not token or not chat_id:
            return False, "Token do Bot ou Chat ID não informados."

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": "🛡️ *ServONVIF - Alerta de Teste*\n\nConexão com o Telegram estabelecida com sucesso! As notificações de movimento chegarão aqui em tempo real.",
            "parse_mode": "Markdown"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    return True, "Mensagem enviada com sucesso ao Telegram!"
                else:
                    return False, f"Erro na API do Telegram: {response.text}"
        except Exception as e:
            return False, f"Falha na requisição: {str(e)}"

telegram_service = TelegramService()

