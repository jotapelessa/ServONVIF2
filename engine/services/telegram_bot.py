import asyncio
import time
import os
import unicodedata
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx
from loguru import logger
from engine.config.settings import settings

def normalize_tag(text: str) -> str:
    """
    Normalizes a text string into a valid Telegram hashtag without accents or special characters.
    """
    if not text:
        return ""
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    text = re.sub(r'[^a-zA-Z0-9_]', '_', text.strip().lower())
    text = re.sub(r'_+', '_', text).strip('_')
    return text

def build_semantic_hashtags(
    camera_id: int,
    camera_name: str,
    dt: datetime,
    plate_info: Optional[Dict[str, Any]] = None,
    is_video: bool = False
) -> str:
    """
    Builds a rich, indexed set of hashtags for Telegram Cloud Vault search filtering.
    Supports queries by: Year, Month, Day, Weekday, Hour, Period, Camera, Person, License Plate, Brand, Model.
    """
    tags = set()

    # 1. System Base & Media Type
    tags.add("servonvif")
    tags.add("seguranca")
    tags.add("movimento")
    tags.add("video_mp4" if is_video else "foto_alerta")

    # 2. Camera Identity & Channel
    tags.add(f"cam{camera_id}")
    clean_cam = normalize_tag(camera_name)
    if clean_cam:
        tags.add(clean_cam)
        for part in clean_cam.split('_'):
            if len(part) >= 3 and part not in {"camera", "ip", "onvif"}:
                tags.add(part)

    # 3. Temporal Indexing (Year, Month, Day, Period, Hour)
    meses_pt = ['', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    meses_abbr = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    dias_semana_pt = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']

    ano = dt.year
    mes_num = dt.month
    mes_nome = meses_pt[mes_num]
    mes_curto = meses_abbr[mes_num]
    dia = dt.day
    hora = dt.hour

    # Year & Month combos
    tags.add(str(ano))
    tags.add(f"ano{ano}")
    tags.add(mes_nome)
    tags.add(f"{mes_nome}{ano}")
    tags.add(f"{mes_curto}{ano}")
    tags.add(f"mes{mes_num:02d}")

    # Day & Date combos
    tags.add(f"dia{dia:02d}")
    tags.add(f"d{dia:02d}_{mes_num:02d}_{ano}")
    tags.add(f"{dia:02d}_{mes_num:02d}_{ano}")
    tags.add(dias_semana_pt[dt.weekday()])

    # Hour & Day period
    tags.add(f"h{hora:02d}")
    periodo = "madrugada" if hora < 6 else "manha" if hora < 12 else "tarde" if hora < 18 else "noite"
    tags.add(periodo)

    # 4. LPR / Vehicle / Person Semantic Tags
    if plate_info:
        # Plate Number
        plate = plate_info.get("plate_number")
        if plate:
            clean_plate = normalize_tag(plate)
            tags.add(clean_plate)
            tags.add(f"placa_{clean_plate}")
            tags.add("placa")
            tags.add("lpr")

        # Owner / Person Identified
        owner = plate_info.get("owner_name")
        if owner:
            clean_owner = normalize_tag(owner)
            tags.add(clean_owner)
            for part in clean_owner.split('_'):
                if len(part) >= 2 and part not in {"de", "da", "do", "dos", "das"}:
                    tags.add(part)

        # Vehicle Category
        category = plate_info.get("category")
        if category:
            tags.add(normalize_tag(category))

        # Vehicle Model & Brand
        model = plate_info.get("vehicle_model")
        if model:
            clean_model = normalize_tag(model)
            tags.add(clean_model)
            for part in clean_model.split('_'):
                if len(part) >= 3 and part not in {"carro", "veiculo", "modelo"}:
                    tags.add(part)

    sorted_tags = sorted(['#' + t for t in tags])
    return " ".join(sorted_tags)


def format_vault_caption(
    camera_id: int,
    camera_name: str,
    dt: datetime,
    score: Optional[float] = None,
    plate_info: Optional[Dict[str, Any]] = None,
    duration_seconds: Optional[float] = None,
    file_size_mb: Optional[float] = None,
    is_video: bool = False
) -> str:
    """
    Builds an ultra-clean, structured caption for Telegram Cloud Vault with metadata and clickable hashtags.
    """
    dias_semana_pt = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
    dia_sem = dias_semana_pt[dt.weekday()]
    data_formatada = dt.strftime("%d/%m/%Y às %H:%M:%S")

    tipo_header = "🎥 𝗩𝗜́𝗗𝗘𝗢 𝗗𝗘 𝗘𝗩𝗘𝗡𝗧𝗢" if is_video else "🚨 𝗔𝗟𝗘𝗥𝗧𝗔 𝗗𝗘 𝗠𝗢𝗩𝗜𝗠𝗘𝗡𝗧𝗢"

    lines = [
        f"{tipo_header} • 𝗦𝗲𝗿𝘃𝗢𝗡𝗩𝗜𝗙 𝗖𝗹𝗼𝘂𝗱",
        "━━━━━━━━━━━━━━━━━━━━",
        f"📍 𝗟𝗼𝗰𝗮𝗹: {camera_name} (Câmera #{camera_id})",
        f"⏱ 𝗗𝗮𝘁𝗮/𝗛𝗼𝗿𝗮: {data_formatada} ({dia_sem})",
    ]

    if score is not None:
        lines.append(f"📊 𝗜𝗻𝘁𝗲𝗻𝘀𝗶𝗱𝗮𝗱𝗲: {score * 100:.1f}% de precisão")

    if duration_seconds is not None and duration_seconds > 0:
        lines.append(f"⏳ 𝗗𝘂𝗿𝗮𝗰̧𝗮̃𝗼: {duration_seconds:.1f}s")

    if file_size_mb is not None and file_size_mb > 0:
        lines.append(f"📁 𝗧𝗮𝗺𝗮𝗻𝗵𝗼: {file_size_mb:.2f} MB")

    if plate_info:
        plate = plate_info.get("plate_number", "")
        owner = plate_info.get("owner_name", "")
        cat = plate_info.get("category", "MORADOR")
        model = plate_info.get("vehicle_model", "")
        lines.append(f"🚗 𝗟𝗣𝗥 / 𝗜𝗱𝗲𝗻𝘁𝗶𝗳𝗶𝗰𝗮𝗰̧𝗮̃𝗼: {cat} • {owner} ({plate}) - {model}")

    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("🏷️ 𝗕𝘂𝘀𝗰𝗮 𝗜𝗻𝘀𝘁𝗮𝗻𝘁𝗮̂𝗻𝗲𝗮 (𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗗𝗿𝗶𝘃𝗲):")

    hashtags = build_semantic_hashtags(
        camera_id=camera_id,
        camera_name=camera_name,
        dt=dt,
        plate_info=plate_info,
        is_video=is_video
    )
    lines.append(hashtags)

    caption = "\n".join(lines)

    # Telegram caption hard limit is 1024 characters
    if len(caption) > 1020:
        caption = caption[:1016] + "..."

    return caption


class TelegramService:
    """
    Asynchronous Telegram Bot notification & Cloud Vault storage client using official Telegram Bot HTTP API.
    Includes rate-limiting and semantic hashtag indexation for instant cloud search.
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
        score: float,
        plate_info: Optional[Dict[str, Any]] = None,
        event_dt: Optional[datetime] = None
    ) -> bool:
        if not self.is_configured:
            logger.debug("Telegram is not configured. Skipping alert.")
            return False

        if getattr(settings, "TELEGRAM_PAUSED", False):
            logger.info("⏸️ Telegram Cloud Vault dispatch is PAUSED in settings. Skipping photo alert.")
            return False

        if not getattr(settings, "TELEGRAM_ENABLED", True):
            logger.debug("Telegram alerts are disabled in settings.")
            return False

        if not self.can_send_for_camera(camera_id):
            logger.debug(f"Telegram alert for camera {camera_id} suppressed by cooldown.")
            return False

        path_obj = Path(photo_path)
        if not path_obj.exists():
            logger.error(f"Thumbnail not found: {photo_path}")
            return False

        dt = event_dt or datetime.utcnow()
        caption = format_vault_caption(
            camera_id=camera_id,
            camera_name=camera_name,
            dt=dt,
            score=score,
            plate_info=plate_info,
            is_video=False
        )

        url = f"{self.base_url}/sendPhoto"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"photo": (path_obj.name, f, "image/jpeg")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption,
                    }
                    response = await client.post(url, data=data, files=files)
                    if response.status_code == 200:
                        logger.info(f"📸 Telegram Cloud Vault: Photo alert sent with hashtags for camera [{camera_id}] {camera_name}")
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
        video_path: str,
        score: Optional[float] = None,
        plate_info: Optional[Dict[str, Any]] = None,
        duration_seconds: Optional[float] = None,
        event_dt: Optional[datetime] = None
    ) -> bool:
        if not self.is_configured:
            return False

        if getattr(settings, "TELEGRAM_PAUSED", False):
            logger.info(f"⏸️ Telegram video dispatch is PAUSED. Skipping clip upload for camera [{camera_id}].")
            return False

        if not getattr(settings, "TELEGRAM_ENABLED", True):
            return False

        path_obj = Path(video_path)
        if not path_obj.exists():
            return False

        dt = event_dt or datetime.utcnow()
        file_size_mb = os.path.getsize(path_obj) / (1024 * 1024)

        caption = format_vault_caption(
            camera_id=camera_id,
            camera_name=camera_name,
            dt=dt,
            score=score,
            plate_info=plate_info,
            duration_seconds=duration_seconds,
            file_size_mb=file_size_mb,
            is_video=True
        )

        url = f"{self.base_url}/sendVideo"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"video": (path_obj.name, f, "video/mp4")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption,
                        "supports_streaming": "true"
                    }
                    response = await client.post(url, data=data, files=files)
                    if response.status_code == 200:
                        logger.info(f"🎥 Telegram Cloud Vault: Video clip uploaded with semantic hashtags for camera [{camera_id}] ({file_size_mb:.1f} MB)")
                        return True
                    else:
                        logger.warning(f"Telegram video upload status {response.status_code}: {response.text}")
                        return False
        except Exception as e:
            logger.error(f"Failed to send Telegram video: {e}")
            return False

    async def send_backup_document(
        self,
        json_bytes: bytes,
        filename: str,
        reason: str = "Alteração de Configurações"
    ) -> tuple[bool, str]:
        if not self.is_configured:
            return False, "Bot do Telegram não configurado. Adicione o Token do Bot e o Chat ID na aba 'Bot do Telegram'."

        if not getattr(settings, "TELEGRAM_ENABLED", True):
            return False, "O serviço do Telegram está desativado nas configurações."

        now = datetime.now()
        date_str = now.strftime("%d/%m/%Y às %H:%M:%S")
        tag_date = f"#d{now.strftime('%d_%m_%Y')}"
        tag_month = f"#{now.strftime('%B%Y').lower()}"
        size_kb = len(json_bytes) / 1024

        caption = (
            f"📦 <b>ServONVIF • Backup Automático de Configurações</b>\n\n"
            f"📅 <b>Data e Hora:</b> <code>{date_str}</code>\n"
            f"🏷️ <b>Motivo:</b> {reason}\n"
            f"🔢 <b>Versão do Servidor:</b> <code>{settings.VERSION}</code>\n"
            f"💾 <b>Tamanho:</b> <code>{size_kb:.1f} KB</code>\n\n"
            f"💡 <i>Guarde este arquivo .json. Você pode restaurar todas as câmeras, zonas e placas a qualquer momento no ServONVIF!</i>\n\n"
            f"#backup #servonvif #cloudvault #restauracao {tag_date} {tag_month}"
        )

        url = f"{self.base_url}/sendDocument"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"document": (filename, json_bytes, "application/json")}
                data = {
                    "chat_id": self.chat_id,
                    "caption": caption,
                    "parse_mode": "HTML",
                }
                response = await client.post(url, data=data, files=files)
                if response.status_code == 200:
                    logger.info(f"☁️ Cópia de backup JSON enviada com sucesso para o Telegram ({filename}, Motivo: {reason})")
                    return True, "Arquivo universal de backup (.json) enviado com sucesso para o seu Telegram!"
                else:
                    err_desc = response.text
                    try:
                        err_json = response.json()
                        err_desc = err_json.get("description", err_desc)
                    except Exception:
                        pass
                    logger.warning(f"Falha ao enviar backup para o Telegram: {err_desc}")
                    return False, f"Erro do Telegram: {err_desc}"
        except Exception as e:
            logger.error(f"Erro ao enviar documento de backup ao Telegram: {e}")
            return False, f"Falha de conexão com Telegram: {str(e)}"

    async def send_test_message(self, custom_token: Optional[str] = None, custom_chat_id: Optional[str] = None) -> tuple[bool, str]:
        token = custom_token or self.bot_token
        chat_id = custom_chat_id or self.chat_id
        if not token or not chat_id:
            return False, "Token do Bot ou Chat ID não informados."

        now = datetime.now()
        sample_plate = {
            "plate_number": "BRA2E19",
            "owner_name": "João Paulo",
            "category": "MORADOR",
            "vehicle_model": "BYD Dolphin"
        }
        sample_caption = format_vault_caption(
            camera_id=1,
            camera_name="Portão Principal",
            dt=now,
            score=0.98,
            plate_info=sample_plate,
            duration_seconds=8.5,
            file_size_mb=3.4,
            is_video=True
        )

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": f"🛡️ *ServONVIF Cloud Vault - Teste de Indexação*\n\n{sample_caption}\n\n💡 *Como Pesquisar:* Toque em qualquer uma das hashtags acima para filtrar todos os vídeos correspondentes no Telegram!",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    return True, "Mensagem de teste do Cloud Vault com hashtags enviada com sucesso ao Telegram!"
                else:
                    return False, f"Erro na API do Telegram: {response.text}"
        except Exception as e:
            return False, f"Falha na requisição: {str(e)}"

telegram_service = TelegramService()
