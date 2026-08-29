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


def diagnose_telegram_error(e: Exception) -> str:
    err_str = str(e)
    if "nodename nor servname provided" in err_str or "Errno 8" in err_str or "getaddrinfo" in err_str or "NameResolutionError" in err_str:
        return (
            "❌ Falha de Conexão com a Internet / DNS:\n"
            "O servidor não conseguiu resolver o endereço 'api.telegram.org' (DNS [Errno 8]).\n\n"
            "🔍 Diagnóstico e Solução:\n"
            "1. Verifique se o seu computador/servidor está conectado à internet pública.\n"
            "2. Se estiver usando Tailscale ou VPN, confira se o DNS está configurado para internet externa.\n"
            "3. Teste a conexão abrindo um terminal e digitando: ping -c 2 api.telegram.org"
        )
    elif "ConnectTimeout" in err_str or "TimeoutException" in err_str or "timed out" in err_str:
        return (
            "⏱️ Tempo Limite Esgotado (Timeout):\n"
            "A API do Telegram demorou muito para responder. Verifique a estabilidade da sua conexão com a internet."
        )
    elif "401" in err_str or "Unauthorized" in err_str:
        return (
            "🔑 Token do Bot Inválido (HTTP 401):\n"
            "O Telegram rejeitou o token fornecido. Verifique o Token gerado pelo @BotFather e salve novamente."
        )
    elif "chat not found" in err_str or "400" in err_str:
        return (
            "💬 Chat ID Não Encontrado (HTTP 400):\n"
            "O bot não conseguiu enviar mensagem para o Chat ID fornecido. Abra o Telegram, procure seu bot e envie /start primeiro!"
        )
    return f"Falha de conexão com Telegram: {err_str}"


def diagnose_telegram_response(status_code: int, response_text: str) -> str:
    try:
        data = json.loads(response_text)
        desc = data.get("description", response_text)
    except Exception:
        desc = response_text

    if status_code == 401:
        return f"🔑 Token Inválido (HTTP 401): {desc}. Verifique o Token obtido no @BotFather."
    elif status_code == 400 and "chat not found" in desc.lower():
        return f"💬 Chat ID Inválido (HTTP 400): {desc}. Abra o Telegram, procure seu bot e envie /start primeiro!"
    elif status_code == 403:
        return f"🚫 Acesso Bloqueado (HTTP 403): {desc}. O bot foi bloqueado pelo usuário ou não tem permissão para enviar mensagens."
    return f"Erro na API do Telegram (HTTP {status_code}): {desc}"


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

        if getattr(settings, "TELEGRAM_DISPATCH_MODE", "all") == "video_only":
            logger.debug("Telegram dispatch mode is 'video_only'. Skipping photo alert.")
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
        file_size_kb = os.path.getsize(path_obj) / 1024
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"photo": (path_obj.name, f, "image/jpeg")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption,
                    }
                    response = await client.post(url, data=data, files=files)
                    elapsed = round(time.time() - t0, 2)
                    speed_kb_s = round(file_size_kb / max(elapsed, 0.05), 1)
                    if response.status_code == 200:
                        logger.success(
                            f"[Telegram Bot] ✅ Alerta de FOTO enviado com SUCESSO para o Chat ID {self.chat_id} "
                            f"(Câmera: #{camera_id} '{camera_name}' | {file_size_kb:.1f} KB em {elapsed}s | Velocidade: {speed_kb_s} KB/s)"
                        )
                        self.mark_sent(camera_id)
                        return True
                    else:
                        logger.error(
                            f"[Telegram Bot] ❌ FALHA ao enviar foto no Telegram (Status {response.status_code}): {response.text} (Tempo: {elapsed}s)"
                        )
                        return False
        except Exception as e:
            elapsed = round(time.time() - t0, 2)
            logger.error(f"[Telegram Bot] ❌ Erro de conexão ao enviar foto para o Telegram: {e} (Tempo: {elapsed}s)")
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
            logger.info(f"[Telegram Bot] ⏸️ Envio de vídeos está PAUSADO no momento. Ignorando clipe para câmera [{camera_id}].")
            return False

        if getattr(settings, "TELEGRAM_DISPATCH_MODE", "all") == "photo_only":
            logger.debug("[Telegram Bot] Modo de envio configurado apenas para fotos. Ignorando clipe de vídeo.")
            return False

        if not getattr(settings, "TELEGRAM_ENABLED", True):
            return False

        path_obj = Path(video_path)
        if not path_obj.exists():
            logger.warning(f"[Telegram Bot] ⚠️ Arquivo de vídeo MP4 não encontrado para envio: {video_path}")
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

        # Extract native video dimensions for Telegram player HD rendering
        vid_w, vid_h, vid_dur = None, None, None
        try:
            import cv2
            cap_probe = cv2.VideoCapture(str(path_obj))
            if cap_probe.isOpened():
                vid_w = int(cap_probe.get(cv2.CAP_PROP_FRAME_WIDTH))
                vid_h = int(cap_probe.get(cv2.CAP_PROP_FRAME_HEIGHT))
                frame_cnt = cap_probe.get(cv2.CAP_PROP_FRAME_COUNT)
                probe_fps = cap_probe.get(cv2.CAP_PROP_FPS) or 20.0
                vid_dur = int(frame_cnt / probe_fps) if probe_fps > 0 else int(duration_seconds or 0)
            cap_probe.release()
        except Exception:
            pass

        url = f"{self.base_url}/sendVideo"
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                with open(path_obj, "rb") as f:
                    files = {"video": (path_obj.name, f, "video/mp4")}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption,
                        "supports_streaming": "true"
                    }
                    if vid_w and vid_h:
                        data["width"] = str(vid_w)
                        data["height"] = str(vid_h)
                    if vid_dur:
                        data["duration"] = str(vid_dur)

                    response = await client.post(url, data=data, files=files)
                    elapsed = round(time.time() - t0, 2)
                    speed_mb_s = round(file_size_mb / max(elapsed, 0.1), 2)
                    if response.status_code == 200:
                        logger.success(
                            f"[Telegram Bot] 🎥 Vídeo MP4 gravado enviado com SUCESSO para o Chat ID {self.chat_id} "
                            f"(Câmera: #{camera_id} '{camera_name}' | {file_size_mb:.2f} MB em {elapsed}s | Velocidade: {speed_mb_s} MB/s)"
                        )
                        return True
                    else:
                        logger.error(
                            f"[Telegram Bot] ❌ FALHA ao enviar vídeo no Telegram (Status {response.status_code}): {response.text} (Tempo: {elapsed}s)"
                        )
                        return False
        except Exception as e:
            elapsed = round(time.time() - t0, 2)
            logger.error(f"[Telegram Bot] ❌ Erro de conexão ao enviar vídeo MP4 ao Telegram: {e} (Tempo: {elapsed}s)")
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
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"document": (filename, json_bytes, "application/json")}
                data = {
                    "chat_id": self.chat_id,
                    "caption": caption,
                    "parse_mode": "HTML",
                }
                response = await client.post(url, data=data, files=files)
                elapsed = round(time.time() - t0, 2)
                if response.status_code == 200:
                    logger.success(
                        f"[Telegram Bot] 📦 Cópia de Backup JSON (.json) enviada com SUCESSO para o Telegram "
                        f"({filename} | {size_kb:.1f} KB em {elapsed}s | Motivo: '{reason}')"
                    )
                    return True, "Arquivo universal de backup (.json) enviado com sucesso para o seu Telegram!"
                else:
                    err_desc = response.text
                    try:
                        err_json = response.json()
                        err_desc = err_json.get("description", err_desc)
                    except Exception:
                        pass
                    logger.error(f"[Telegram Bot] ❌ Falha ao enviar backup para o Telegram: {err_desc} (Tempo: {elapsed}s)")
                    return False, f"Erro do Telegram: {err_desc}"
        except Exception as e:
            elapsed = round(time.time() - t0, 2)
            diag = diagnose_telegram_error(e)
            logger.error(f"[Telegram Bot] ❌ Erro de conexão ao enviar backup JSON ao Telegram: {e} (Tempo: {elapsed}s)")
            return False, diag

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
                    return False, diagnose_telegram_response(response.status_code, response.text)
        except Exception as e:
            return False, diagnose_telegram_error(e)

    async def send_test_photo(self, camera_id: Optional[int] = None) -> tuple[bool, str]:
        from engine.core.camera_manager import camera_manager
        from engine.core.media_writer import MediaWriter

        if not self.is_configured:
            return False, "Bot do Telegram não configurado. Adicione o Token e o Chat ID."

        target_ingestor = None
        if camera_id and camera_id in camera_manager.ingestors:
            target_ingestor = camera_manager.ingestors[camera_id]
        elif camera_manager.ingestors:
            target_ingestor = next(iter(camera_manager.ingestors.values()))

        if not target_ingestor or target_ingestor._latest_frame is None:
            return False, "Nenhuma câmera ativa transmitindo frames no momento."

        frame = target_ingestor._latest_frame.copy()
        now = datetime.utcnow()
        cam = target_ingestor.camera

        thumb_path = MediaWriter.save_thumbnail(
            camera_id=cam.id,
            timestamp=now,
            frame_bgr=frame
        )

        success = await self.send_photo_alert(
            camera_id=cam.id,
            camera_name=cam.name,
            timestamp_str=now.strftime("%d/%m/%Y %H:%M:%S"),
            photo_path=thumb_path,
            score=0.99,
            event_dt=now
        )

        h, w = frame.shape[:2]
        if success:
            return True, f"📸 Foto de teste em Qualidade Máxima ({w}x{h} - {w*h/1000000:.1f}MP) enviada com sucesso para o Telegram!"
        return False, "Falha ao enviar foto para a API do Telegram."

    async def send_test_video(self, camera_id: Optional[int] = None, duration_seconds: Optional[float] = None) -> tuple[bool, str]:
        from engine.core.camera_manager import camera_manager
        from engine.core.media_writer import MediaWriter

        if not self.is_configured:
            return False, "Bot do Telegram não configurado. Adicione o Token e o Chat ID."

        target_ingestor = None
        if camera_id and camera_id in camera_manager.ingestors:
            target_ingestor = camera_manager.ingestors[camera_id]
        elif camera_manager.ingestors:
            target_ingestor = next(iter(camera_manager.ingestors.values()))

        if not target_ingestor:
            return False, "Nenhuma câmera ativa no momento."

        target_duration = float(duration_seconds or getattr(settings, "TELEGRAM_VIDEO_DURATION_SECONDS", 30))
        if target_duration <= 0:
            target_duration = 30.0

        # Retrieve window with timestamps from ring buffer
        pairs = target_ingestor.ring_buffer.get_window_with_timestamps(pre_seconds=target_duration)
        
        # If ring buffer does not have full requested duration yet (e.g. server recently started), collect remaining frames live
        curr_buf_time = (pairs[-1][1] - pairs[0][1]) if len(pairs) >= 2 else 0.0
        if curr_buf_time < (target_duration * 0.9):
            collected = list(pairs)
            start_collect = time.time()
            needed_duration = target_duration - curr_buf_time
            last_appended = 0.0
            
            while (time.time() - start_collect) < needed_duration:
                await asyncio.sleep(0.04)
                if target_ingestor._latest_frame is not None:
                    now_t = time.time()
                    if now_t - last_appended >= 0.048:
                        last_appended = now_t
                        with target_ingestor._frame_lock:
                            collected.append((target_ingestor._latest_frame.copy(), now_t))
            pairs = collected

        if not pairs or len(pairs) < 10:
            if target_ingestor._latest_frame is not None:
                now_t = time.time()
                pairs = [(target_ingestor._latest_frame.copy(), now_t + i * 0.05) for i in range(int(target_duration * 20))]
            else:
                return False, "Buffer de vídeo insuficiente para gravação de teste."

        frames = [p[0] for p in pairs]
        timestamps = [p[1] for p in pairs]

        # Calculate exact real FPS from elapsed timestamps
        if len(timestamps) >= 2 and (timestamps[-1] - timestamps[0]) > 0.5:
            real_elapsed = timestamps[-1] - timestamps[0]
            calculated_fps = (len(frames) - 1) / real_elapsed
            actual_fps = max(5.0, min(60.0, calculated_fps))
        else:
            actual_fps = 20.0

        now = datetime.utcnow()
        cam = target_ingestor.camera
        h, w = frames[0].shape[:2]

        video_path = MediaWriter.save_video_clip(
            camera_id=cam.id,
            timestamp=now,
            frames=frames,
            fps=actual_fps
        )

        if not video_path:
            return False, "Erro ao codificar clipe de vídeo MP4."

        final_duration = len(frames) / actual_fps if actual_fps > 0 else target_duration
        success = await self.send_video_clip(
            camera_id=cam.id,
            camera_name=cam.name,
            video_path=video_path,
            score=0.99,
            duration_seconds=final_duration,
            event_dt=now
        )

        if success:
            return True, f"🎥 Clipe de teste em Qualidade Máxima ({w}x{h} HD • {final_duration:.1f}s • CRF 17) enviado com sucesso para o Telegram!"
        return False, "Falha ao enviar clipe de vídeo para a API do Telegram."

telegram_service = TelegramService()
