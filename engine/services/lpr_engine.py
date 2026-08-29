import re
import os
import time
from datetime import datetime
from typing import Optional, Dict, Any, Tuple, List
import cv2
import numpy as np
from loguru import logger
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from engine.database.models import Vehicle, PlateDetectionLog
from engine.api.websocket_hub import ws_hub

# RapidOCR / PaddleOCR high-speed inference engine
try:
    from rapidocr_onnxruntime import RapidOCR
    _ocr_engine = RapidOCR()
    OCR_AVAILABLE = True
    logger.info("🧠 RapidOCR (PP-OCRv4 ONNX) inicializado com sucesso!")
except Exception as e:
    _ocr_engine = None
    OCR_AVAILABLE = False
    logger.warning(f"⚠️ RapidOCR não pôde ser inicializado: {e}")


class LPREngine:
    """
    License Plate Recognition (LPR/ANPR) 2-Stage Processing Engine for ServONVIF.
    Specialized in Brazilian Mercosul (ABC1D23) and Standard Gray Plates (ABC1234).
    Driven by YOLO vehicle bounding boxes and RapidOCR/PP-OCR neural text extraction.
    """

    # Brazilian Regex Patterns
    MERCOSUL_REGEX = re.compile(r"^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$")
    OLD_PLATE_REGEX = re.compile(r"^[A-Z]{3}[0-9]{4}$")

    # Blacklist of indoor/garage words and brand textures
    BLACKLIST_WORDS = {
        "SAMSUNG", "PORTAO1", "ENTRADA", "GARAGEM", "ESTACIO", "POSITIV",
        "CONTROL", "GRAVADO", "CAMERAS", "INTELBR", "HIKVISI", "SECURITY",
        "FABRICA", "PROIBID", "ATENCAO", "CUIDADO", "ENERGIA", "ELETRIC",
        "PERIGOS", "PLASTIC", "SERVICE", "WINDOWS", "ANDROID", "DEFAULT",
        "ALARMES", "SISTEMA", "OFICINA", "DESKJET", "PREMIUM", "MOTORLA",
        "BRUSHED", "PARKING", "VEICULO", "CAMERA0", "CAMERAS"
    }

    @classmethod
    def clean_plate_text(cls, raw_text: str) -> str:
        """Strips spaces, dashes, dots and special characters. Converts to uppercase."""
        if not raw_text:
            return ""
        return re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()

    @classmethod
    def repair_mercosul_ocr(cls, text: str) -> Optional[str]:
        """
        Applies positional heuristics to correct AT MOST ONE ambiguous OCR character.
        Mercosul pattern: LLLNLNN (Letters at 0,1,2,4; Numbers at 3,5,6).
        """
        if len(text) != 7 or not text.isalnum():
            return None

        digit_to_letter = {
            '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A',
            '5': 'S', '6': 'G', '8': 'B'
        }
        letter_to_digit = {
            'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1',
            'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6',
            'B': '8', 'T': '7'
        }

        chars = list(text)
        violations = 0

        # Positions 0, 1, 2 must be LETTERS
        for i in range(3):
            if not chars[i].isalpha():
                if chars[i] in digit_to_letter:
                    chars[i] = digit_to_letter[chars[i]]
                    violations += 1
                else:
                    return None

        # Position 3 must be a DIGIT
        if not chars[3].isdigit():
            if chars[3] in letter_to_digit:
                chars[3] = letter_to_digit[chars[3]]
                violations += 1
            else:
                return None

        # Position 4 can be LETTER or DIGIT (Mercosul standard uses Letter)
        if chars[4].isdigit() and chars[4] in digit_to_letter:
            chars[4] = digit_to_letter[chars[4]]
            violations += 1

        # Positions 5 and 6 must be DIGITS
        for i in (5, 6):
            if not chars[i].isdigit():
                if chars[i] in letter_to_digit:
                    chars[i] = letter_to_digit[chars[i]]
                    violations += 1
                else:
                    return None

        if violations <= 1:
            repaired = "".join(chars)
            if cls.MERCOSUL_REGEX.match(repaired):
                return repaired
        return None

    @classmethod
    def validate_plate(cls, raw_text: str) -> Tuple[bool, str, str]:
        """
        Validates text against Brazilian license plate standards.
        Returns: (is_valid, plate_type, formatted_plate)
        """
        cleaned = cls.clean_plate_text(raw_text)

        if len(cleaned) == 7:
            if cleaned in cls.BLACKLIST_WORDS or len(set(cleaned)) < 3:
                return False, "INVALID", cleaned

            # Direct Old Gray Plate match (LLLNNNN - Position 4 is a Digit)
            if cls.OLD_PLATE_REGEX.match(cleaned):
                return True, "ANTIGA", cleaned

            # Direct Mercosul match (LLLNLNN - Position 4 is a Letter)
            if cls.MERCOSUL_REGEX.match(cleaned):
                return True, "MERCOSUL", cleaned

            # Strict Single-character heuristic repair
            repaired = cls.repair_mercosul_ocr(cleaned)
            if repaired and repaired not in cls.BLACKLIST_WORDS and len(set(repaired)) >= 3:
                return True, "MERCOSUL", repaired

        return False, "INVALID", cleaned

    @classmethod
    def preprocess_plate_crop(cls, crop_bgr: np.ndarray) -> np.ndarray:
        """
        Applies lightweight contrast and clarity preprocessing:
        1. Grayscale conversion.
        2. Contrast enhancement via Histogram Equalization.
        """
        if crop_bgr is None or crop_bgr.size == 0:
            return crop_bgr
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        # Convert back to 3-channel for OCR engine compatibility
        return cv2.cvtColor(equalized, cv2.COLOR_GRAY2BGR)

    @classmethod
    def scan_vehicle_crop(cls, vehicle_crop_bgr: np.ndarray) -> Optional[Tuple[str, str, float, np.ndarray]]:
        """
        Stage 2 LPR:
        Receives a vehicle ROI crop from YOLO, runs pre-processing + OCR,
        and extracts any matching Brazilian plate.
        Returns: (plate_number, plate_type, confidence, plate_patch) or None
        """
        if not OCR_AVAILABLE or _ocr_engine is None or vehicle_crop_bgr is None:
            return None

        h, w = vehicle_crop_bgr.shape[:2]
        if h < 20 or w < 30:
            return None

        # Preprocessing
        proc_crop = cls.preprocess_plate_crop(vehicle_crop_bgr)

        try:
            results, _ = _ocr_engine(proc_crop)
            if not results:
                # Fallback to raw crop
                results, _ = _ocr_engine(vehicle_crop_bgr)

            if not results:
                return None

            best_candidate = None
            best_conf = 0.0

            for item in results:
                box, text, conf = item[0], item[1], float(item[2])
                cleaned = cls.clean_plate_text(text)
                is_valid, ptype, final_plate = cls.validate_plate(cleaned)

                if is_valid and conf > best_conf:
                    # Calculate bounding box of the plate within the vehicle crop
                    pts = np.array(box, dtype=np.int32)
                    bx, by, bw, bh = cv2.boundingRect(pts)
                    bx, by = max(0, bx), max(0, by)
                    bw = min(w - bx, bw)
                    bh = min(h - by, bh)
                    plate_patch = vehicle_crop_bgr[by:by+bh, bx:bx+bw] if (bw > 10 and bh > 10) else vehicle_crop_bgr

                    best_candidate = (final_plate, ptype, conf, plate_patch)
                    best_conf = conf

            return best_candidate

        except Exception as e:
            logger.debug(f"[LPR] OCR scan exception: {e}")
            return None

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
        1. Normalizes and validates plate string.
        2. Queries database for registered vehicle metadata.
        3. Persists detection in SQLite PlateDetectionLog.
        4. Broadcasts real-time WebSocket alert for Smart TV & Web UI.
        """
        is_valid, plate_type, cleaned_plate = cls.validate_plate(raw_plate)
        if not is_valid:
            return {}

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

            vehicle.last_seen_at = datetime.utcnow()
            vehicle.total_detections += 1
            session.add(vehicle)

        detection_log = PlateDetectionLog(
            camera_id=camera_id,
            camera_name=camera_name,
            plate_number=cleaned_plate,
            plate_type=plate_type,
            confidence=confidence,
            category=category,
            owner_name=owner_name,
            vehicle_model=vehicle_model,
            is_registered=is_registered,
            snapshot_path=snapshot_path,
            detected_at=datetime.utcnow()
        )
        session.add(detection_log)
        await session.commit()
        await session.refresh(detection_log)

        payload = {
            "type": "LPR_DETECTION",
            "id": detection_log.id,
            "camera_id": camera_id,
            "camera_name": camera_name,
            "plate_number": cleaned_plate,
            "plate_type": plate_type,
            "confidence": confidence,
            "category": category,
            "owner_name": owner_name,
            "vehicle_model": vehicle_model,
            "is_registered": is_registered,
            "snapshot_path": snapshot_path,
            "detected_at": detection_log.detected_at.isoformat()
        }

        # Real-time WebSocket Broadcast
        await ws_hub.broadcast_event(payload)

        # Log formatted alert
        icon = "🟢" if is_registered else "🟡"
        logger.info(
            f"[LPR Engine] {icon} Placa Detectada: {cleaned_plate} ({plate_type}) | "
            f"Categoria: {category} | Proprietário: {owner_name} | Câmera #{camera_id} '{camera_name}' (Conf: {confidence*100:.1f}%)"
        )

        return payload


lpr_engine = LPREngine()

