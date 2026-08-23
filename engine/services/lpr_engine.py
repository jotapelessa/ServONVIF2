import re
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from loguru import logger
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from engine.database.models import Vehicle, PlateDetectionLog
from engine.api.websocket_hub import ws_hub

class LPREngine:
    """
    License Plate Recognition (LPR/ANPR) Processing Engine for ServONVIF.
    Specialized in Brazilian Mercosul and Standard Gray Plates.
    """

    # Brazilian Regex Patterns
    MERCOSUL_REGEX = re.compile(r"^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$")
    OLD_PLATE_REGEX = re.compile(r"^[A-Z]{3}[0-9]{4}$")

    @classmethod
    def clean_plate_text(cls, raw_text: str) -> str:
        """
        Strips spaces, dashes, dots and special characters.
        Converts to uppercase.
        """
        if not raw_text:
            return ""
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
        return cleaned

    @classmethod
    def repair_mercosul_ocr(cls, text: str) -> str:
        """
        Applies positional heuristics to correct common OCR character confusion in Mercosul plates (LLLNLNN).
        """
        if len(text) != 7:
            return text

        chars = list(text)

        digit_to_letter = {
            '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A',
            '5': 'S', '6': 'G', '8': 'B'
        }
        letter_to_digit = {
            'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1',
            'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6',
            'B': '8', 'T': '7'
        }

        # Positions 0, 1, 2 must be LETTERS
        for i in range(3):
            if chars[i] in digit_to_letter:
                chars[i] = digit_to_letter[chars[i]]

        # Position 3 must be a DIGIT
        if chars[3] in letter_to_digit:
            chars[3] = letter_to_digit[chars[3]]

        # Positions 5, 6 must be DIGITS
        for i in (5, 6):
            if chars[i] in letter_to_digit:
                chars[i] = letter_to_digit[chars[i]]

        return "".join(chars)

    @classmethod
    def validate_plate(cls, plate: str) -> Tuple[bool, str]:
        """
        Validates if the plate is valid Mercosul or Standard Gray format.
        Returns: (is_valid, plate_type)
        """
        cleaned = cls.clean_plate_text(plate)
        if len(cleaned) == 7:
            if cls.MERCOSUL_REGEX.match(cleaned):
                return True, "MERCOSUL"
            if cls.OLD_PLATE_REGEX.match(cleaned):
                return True, "ANTIGA"
            
            # Try auto-repair heuristic
            repaired = cls.repair_mercosul_ocr(cleaned)
            if cls.MERCOSUL_REGEX.match(repaired):
                return True, "MERCOSUL"

        return False, "INVALID"

    @classmethod
    async def process_plate_detection(
        cls,
        session: AsyncSession,
        camera_id: int,
        camera_name: str,
        raw_plate: str,
        confidence: float = 0.95,
        snapshot_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a detected plate:
        1. Cleans and normalizes plate string.
        2. Queries database for registered vehicle info.
        3. Records detection in plate_detection_logs.
        4. Broadcasts real-time WebSocket alert for Android TV PiP & Web Panel.
        """
        cleaned_plate = cls.clean_plate_text(raw_plate)
        is_valid, plate_type = cls.validate_plate(cleaned_plate)

        if not is_valid and len(cleaned_plate) == 7:
            cleaned_plate = cls.repair_mercosul_ocr(cleaned_plate)
            is_valid, plate_type = cls.validate_plate(cleaned_plate)

        # Lookup Vehicle in DB
        statement = select(Vehicle).where(Vehicle.plate_number == cleaned_plate)
        result = await session.execute(statement)
        vehicle = result.scalars().first()

        category = "DESCONHECIDO"
        owner_name = "Não cadastrado"
        vehicle_model = "Veículo"
        is_registered = False

        if vehicle and vehicle.is_active:
            category = vehicle.category
            owner_name = vehicle.owner_name
            vehicle_model = vehicle.vehicle_model
            is_registered = True

            # Update vehicle stats
            vehicle.last_seen_at = datetime.utcnow()
            vehicle.total_detections += 1
            session.add(vehicle)

        # Log Detection
        log_entry = PlateDetectionLog(
            camera_id=camera_id,
            camera_name=camera_name,
            plate_number=cleaned_plate,
            confidence=confidence,
            category=category,
            owner_name=owner_name if is_registered else None,
            vehicle_model=vehicle_model if is_registered else None,
            snapshot_path=snapshot_path,
            detected_at=datetime.utcnow()
        )
        session.add(log_entry)
        await session.commit()
        await session.refresh(log_entry)

        # Format Human Title for Alerts
        if category == "MORADOR":
            alert_title = f"🟢 Morador: {owner_name} ({cleaned_plate})"
        elif category == "VISITANTE":
            alert_title = f"🔵 Visitante Autorizado: {owner_name} ({cleaned_plate})"
        elif category == "PRESTADOR":
            alert_title = f"🟡 Prestador de Serviço: {owner_name} ({cleaned_plate})"
        elif category == "BLOQUEADO":
            alert_title = f"⛔ VEÍCULO BLOQUEADO: {owner_name} ({cleaned_plate})"
        else:
            alert_title = f"🚗 Placa Detectada: {cleaned_plate} ({plate_type})"

        logger.info(f"🚘 [LPR] {alert_title} na câmera {camera_name} (Confiança: {confidence:.0%})")

        # Broadcast WebSocket event to all connected devices
        event_payload = {
            "type": "PLATE_DETECTED",
            "camera_id": camera_id,
            "camera_name": camera_name,
            "plate_number": cleaned_plate,
            "plate_type": plate_type,
            "category": category,
            "owner_name": owner_name,
            "vehicle_model": vehicle_model,
            "confidence": confidence,
            "alert_title": alert_title,
            "timestamp": datetime.utcnow().isoformat(),
            "mjpeg_url": f"/api/mjpeg/{camera_id}",
            "score": float(confidence)
        }

        # WebSocket Hub Broadcast
        await ws_hub.broadcast_motion_alert(
            camera_id=camera_id,
            camera_name=f"{alert_title}",
            score=confidence,
            mjpeg_url=f"/api/mjpeg/{camera_id}"
        )

        return event_payload

lpr_engine = LPREngine()
