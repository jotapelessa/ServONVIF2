import re
import os
from datetime import datetime
from typing import Optional, Dict, Any, Tuple, List
import cv2
import numpy as np
from loguru import logger
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from engine.database.models import Vehicle, PlateDetectionLog
from engine.api.websocket_hub import ws_hub

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


class LPREngine:
    """
    License Plate Recognition (LPR/ANPR) Processing Engine for ServONVIF.
    Specialized in Brazilian Mercosul and Standard Gray Plates.
    Performs real-time frame scanning for both moving and parked/stationary vehicles.
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
    def find_plate_candidates(
        cls,
        frame_bgr: np.ndarray,
        roi_polygon: Optional[List[List[float]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Scans a frame for vehicle license plate regions using OpenCV edge morphology & Tesseract OCR.
        Works seamlessly for parked/stationary cars as well as vehicles in movement.
        """
        if not PYTESSERACT_AVAILABLE or frame_bgr is None:
            return []

        h, w = frame_bgr.shape[:2]
        scan_area = frame_bgr
        offset_x, offset_y = 0, 0

        # Crop to ROI if defined
        if roi_polygon and len(roi_polygon) >= 3:
            pts = []
            for pt in roi_polygon:
                px = int(round(pt[0] * w)) if pt[0] <= 1.0 else int(pt[0])
                py = int(round(pt[1] * h)) if pt[1] <= 1.0 else int(pt[1])
                pts.append([px, py])
            pts_arr = np.array(pts)
            rx, ry, rw, rh = cv2.boundingRect(pts_arr)
            rx = max(0, rx)
            ry = max(0, ry)
            rw = min(w - rx, rw)
            rh = min(h - ry, rh)
            if rw > 80 and rh > 40:
                scan_area = frame_bgr[ry:ry+rh, rx:rx+rw]
                offset_x, offset_y = rx, ry

        sh, sw = scan_area.shape[:2]
        if sh < 40 or sw < 80:
            return []

        candidates: List[Dict[str, Any]] = []
        found_plates = set()

        # 1. Grayscale & Bilateral Filtering
        gray = cv2.cvtColor(scan_area, cv2.COLOR_BGR2GRAY)
        blur = cv2.bilateralFilter(gray, 11, 17, 17)

        # 2. Blackhat morphology to isolate dark text on light plate background
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
        blackhat = cv2.morphologyEx(blur, cv2.MORPH_BLACKHAT, rect_kernel)

        # 3. Sobel edge detection
        grad_x = cv2.Sobel(blackhat, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
        grad_x = np.absolute(grad_x)
        min_val, max_val = np.min(grad_x), np.max(grad_x)
        if max_val > min_val:
            grad_x = (255 * ((grad_x - min_val) / (max_val - min_val))).astype("uint8")
        else:
            grad_x = grad_x.astype("uint8")

        # 4. Closing & Otsu Binarization
        grad_x = cv2.morphologyEx(grad_x, cv2.MORPH_CLOSE, rect_kernel)
        _, thresh = cv2.threshold(grad_x, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        # 5. Find contours for candidate rectangular plate boxes
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            aspect_ratio = cw / float(ch)
            area = cw * ch

            # Standard Brazilian Plate aspect ratio is ~3.08 (40x13cm)
            if 2.0 <= aspect_ratio <= 5.2 and 1200 <= area <= 65000 and cw >= 70 and ch >= 20:
                # Add padding
                pad_x = int(cw * 0.08)
                pad_y = int(ch * 0.15)
                px = max(0, x - pad_x)
                py = max(0, y - pad_y)
                pw = min(sw - px, cw + (pad_x * 2))
                ph = min(sh - py, ch + (pad_y * 2))

                plate_patch = scan_area[py:py+ph, px:px+pw]
                if plate_patch.shape[0] < 15 or plate_patch.shape[1] < 45:
                    continue

                # Preprocess patch for OCR
                patch_gray = cv2.cvtColor(plate_patch, cv2.COLOR_BGR2GRAY)
                # Resize to standard height for OCR accuracy
                scale = 100.0 / patch_gray.shape[0]
                resized = cv2.resize(patch_gray, (int(patch_gray.shape[1] * scale), 100), interpolation=cv2.INTER_CUBIC)
                patch_thresh = cv2.adaptiveThreshold(
                    resized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 19, 9
                )

                # Run Tesseract with license plate whitelist
                try:
                    ocr_text = pytesseract.image_to_string(
                        patch_thresh,
                        config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                    )
                    cleaned = cls.clean_plate_text(ocr_text)

                    # Also try plain resized
                    if len(cleaned) != 7:
                        ocr_text_plain = pytesseract.image_to_string(
                            resized,
                            config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                        )
                        cleaned_plain = cls.clean_plate_text(ocr_text_plain)
                        if len(cleaned_plain) == 7:
                            cleaned = cleaned_plain

                    is_valid, plate_type = cls.validate_plate(cleaned)
                    if not is_valid and len(cleaned) == 7:
                        cleaned = cls.repair_mercosul_ocr(cleaned)
                        is_valid, plate_type = cls.validate_plate(cleaned)

                    if is_valid and cleaned not in found_plates:
                        found_plates.add(cleaned)
                        candidates.append({
                            "plate_number": cleaned,
                            "plate_type": plate_type,
                            "confidence": 0.94,
                            "bbox": (offset_x + px, offset_y + py, pw, ph),
                            "plate_patch": plate_patch
                        })
                except Exception as e:
                    logger.debug(f"Candidate OCR evaluation error: {e}")

        return candidates

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

        # Telegram Cloud Vault Notification
        from engine.services.telegram_bot import telegram_service
        if telegram_service.is_configured:
            plate_info = {
                "plate_number": cleaned_plate,
                "owner_name": owner_name if is_registered else "Desconhecido",
                "category": category,
                "vehicle_model": vehicle_model if is_registered else "Veículo"
            }
            if snapshot_path:
                await telegram_service.send_photo_alert(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    timestamp_str=datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
                    photo_path=snapshot_path,
                    score=confidence,
                    plate_info=plate_info,
                    event_dt=datetime.utcnow()
                )

        return event_payload

lpr_engine = LPREngine()
