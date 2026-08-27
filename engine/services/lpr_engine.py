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
    from PIL import Image
    PYTESSERACT_AVAILABLE = True

    # Auto-discover Tesseract binary across Windows, Linux, and macOS
    import shutil
    if not shutil.which("tesseract"):
        if os.name == "nt":
            windows_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
                os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
            ]
            for wp in windows_paths:
                if os.path.exists(wp):
                    pytesseract.pytesseract.tesseract_cmd = wp
                    break
        elif os.path.exists("/opt/homebrew/bin/tesseract"):
            pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
        elif os.path.exists("/usr/local/bin/tesseract"):
            pytesseract.pytesseract.tesseract_cmd = "/usr/local/bin/tesseract"
        elif os.path.exists("/usr/bin/tesseract"):
            pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"
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

    # Blacklist of common indoor/garage words and brand textures that OCR extracts
    BLACKLIST_WORDS = {
        "SAMSUNG", "PORTAO1", "ENTRADA", "GARAGEM", "ESTACIO", "POSITIV",
        "CONTROL", "GRAVADO", "CAMERAS", "INTELBR", "HIKVISI", "SECURITY",
        "FABRICA", "PROIBID", "ATENCAO", "CUIDADO", "ENERGIA", "ELETRIC",
        "PERIGOS", "PLASTIC", "SERVICE", "WINDOWS", "ANDROID", "DEFAULT",
        "ALARMES", "SISTEMA", "OFICINA", "DESKJET", "PREMIUM", "MOTORLA"
    }

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
    def repair_mercosul_ocr(cls, text: str) -> Optional[str]:
        """
        Applies positional heuristics to correct AT MOST ONE ambiguous OCR character.
        If 2 or more characters deviate from Mercosul (LLLNLNN), it is discarded as non-plate noise.
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
                    return None  # Non-repairable character

        # Position 3 must be a DIGIT
        if not chars[3].isdigit():
            if chars[3] in letter_to_digit:
                chars[3] = letter_to_digit[chars[3]]
                violations += 1
            else:
                return None

        # Position 4 in Mercosul is alphanumeric [A-Z0-9], so both letter and digit are valid

        # Positions 5, 6 must be DIGITS
        for i in (5, 6):
            if not chars[i].isdigit():
                if chars[i] in letter_to_digit:
                    chars[i] = letter_to_digit[chars[i]]
                    violations += 1
                else:
                    return None

        # STRICT: Only allow repair if there was exactly 1 minor OCR ambiguity
        if violations == 1:
            repaired = "".join(chars)
            if cls.MERCOSUL_REGEX.match(repaired):
                return repaired

        return None

    @classmethod
    def validate_plate(cls, plate: str) -> Tuple[bool, str, str]:
        """
        Validates if the plate is valid Mercosul or Standard Gray format.
        Returns: (is_valid, plate_type, plate_str)
        """
        cleaned = cls.clean_plate_text(plate)
        if len(cleaned) == 7:
            # Reject blacklisted static words
            if cleaned in cls.BLACKLIST_WORDS:
                return False, "INVALID", cleaned

            # Reject uniform repetitive noise (e.g., AAAAAAA, 1111111)
            if len(set(cleaned)) < 3:
                return False, "INVALID", cleaned

            # Direct Mercosul match (LLLNLNN)
            if cls.MERCOSUL_REGEX.match(cleaned):
                return True, "MERCOSUL", cleaned

            # Direct Old Gray Plate match (LLLNNNN)
            if cls.OLD_PLATE_REGEX.match(cleaned):
                return True, "ANTIGA", cleaned
            
            # Strict Single-character heuristic repair
            repaired = cls.repair_mercosul_ocr(cleaned)
            if repaired and repaired not in cls.BLACKLIST_WORDS and len(set(repaired)) >= 3:
                return True, "MERCOSUL", repaired

        return False, "INVALID", cleaned

    @classmethod
    def find_plate_candidates(
        cls,
        frame_bgr: np.ndarray,
        roi_polygon: Optional[List[List[float]]] = None,
        motion_bboxes: Optional[List[Tuple[int, int, int, int]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Scans a frame for vehicle license plate regions using OpenCV edge morphology & Tesseract OCR.
        Optimized for:
        - Brazilian Car Plates (Mercosul & Standard Gray - aspect ratio ~3.08)
        - Brazilian Motorcycle Plates (Mercosul & Standard - aspect ratio ~1.35, 2 lines)
        - Fast moving vehicles across sidewalk/street with motion blur & contrast variations.
        """
        if not PYTESSERACT_AVAILABLE or frame_bgr is None:
            return []

        h, w = frame_bgr.shape[:2]
        scan_areas = []

        # 1. If motion bounding boxes exist, prioritize scanning those specific moving vehicle crops
        if motion_bboxes:
            for (bx, by, bw, bh) in motion_bboxes:
                if bw >= 60 and bh >= 40:
                    pad_w = int(bw * 0.15)
                    pad_h = int(bh * 0.15)
                    cx = max(0, bx - pad_w)
                    cy = max(0, by - pad_h)
                    cw = min(w - cx, bw + (pad_w * 2))
                    ch = min(h - cy, bh + (pad_h * 2))
                    crop = frame_bgr[cy:cy+ch, cx:cx+cw]
                    if crop.shape[0] >= 40 and crop.shape[1] >= 60:
                        scan_areas.append((crop, cx, cy))

        # 2. Also scan ROI or full frame
        if not scan_areas:
            scan_area = frame_bgr
            offset_x, offset_y = 0, 0
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
                if rw > 60 and rh > 40:
                    scan_area = frame_bgr[ry:ry+rh, rx:rx+rw]
                    offset_x, offset_y = rx, ry
            scan_areas.append((scan_area, offset_x, offset_y))

        candidates: List[Dict[str, Any]] = []
        found_plates = set()

        for (curr_area, off_x, off_y) in scan_areas[:2]:
            sh, sw = curr_area.shape[:2]
            if sh < 30 or sw < 50:
                continue

            # 1. Grayscale & CLAHE contrast enhancement
            gray = cv2.cvtColor(curr_area, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            contrast_gray = clahe.apply(gray)
            blur = cv2.bilateralFilter(contrast_gray, 9, 75, 75)

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

            # 5. Find contours for candidate plate boxes (Cars & Motorcycles)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            matched_boxes = []
            for cnt in contours:
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect_ratio = cw / float(ch)
                area = cw * ch

                # A) Car Plate Ratio: ~3.08 (Range 2.0 to 5.2)
                is_car = (2.0 <= aspect_ratio <= 5.2 and 700 <= area <= 65000 and cw >= 45 and ch >= 14)
                # B) Motorcycle Plate Ratio: ~1.35 (Range 1.05 to 1.95)
                is_moto = (1.05 <= aspect_ratio <= 1.95 and 550 <= area <= 45000 and cw >= 32 and ch >= 24)

                if is_car:
                    score = abs(aspect_ratio - 3.08)
                    matched_boxes.append((score, x, y, cw, ch, "CAR"))
                elif is_moto:
                    score = abs(aspect_ratio - 1.35)
                    matched_boxes.append((score, x, y, cw, ch, "MOTO"))

            matched_boxes.sort(key=lambda item: item[0])

            # Evaluate top 3 best matching regions
            for _, x, y, cw, ch, vtype in matched_boxes[:3]:
                # Add padding
                pad_x = int(cw * 0.10)
                pad_y = int(ch * 0.15)
                px = max(0, x - pad_x)
                py = max(0, y - pad_y)
                pw = min(sw - px, cw + (pad_x * 2))
                ph = min(sh - py, ch + (pad_y * 2))

                plate_patch = curr_area[py:py+ph, px:px+pw]
                if plate_patch.shape[0] < 12 or plate_patch.shape[1] < 30:
                    continue

                # Preprocess patch for OCR
                patch_gray = cv2.cvtColor(plate_patch, cv2.COLOR_BGR2GRAY)
                scale = 100.0 / patch_gray.shape[0]
                resized = cv2.resize(patch_gray, (int(patch_gray.shape[1] * scale), 100), interpolation=cv2.INTER_CUBIC)
                
                # Try both Adaptive Threshold & Otsu for maximum readability
                patch_thresh = cv2.adaptiveThreshold(
                    resized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 19, 9
                )

                # For motorcycles, use PSM 6 (multi-line block) or PSM 11; for cars use PSM 7 & PSM 6
                psm_modes = ["--psm 6", "--psm 7"] if vtype == "MOTO" else ["--psm 7", "--psm 6"]

                cleaned = ""
                for psm in psm_modes:
                    try:
                        ocr_text = pytesseract.image_to_string(
                            patch_thresh,
                            config=f"{psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                        )
                        cand_cleaned = cls.clean_plate_text(ocr_text)
                        if len(cand_cleaned) == 7:
                            cleaned = cand_cleaned
                            break
                        
                        # Fallback to plain resized
                        ocr_plain = pytesseract.image_to_string(
                            resized,
                            config=f"{psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                        )
                        cand_plain = cls.clean_plate_text(ocr_plain)
                        if len(cand_plain) == 7:
                            cleaned = cand_plain
                    except Exception:
                        pass

                # Validate patch brightness & contrast (plates are never pitch black or blown out)
                mean_val = np.mean(plate_patch)
                if mean_val < 35 or mean_val > 245:
                    continue

                is_valid, plate_type, final_plate = cls.validate_plate(cleaned)

                if is_valid and final_plate not in found_plates:
                    found_plates.add(final_plate)
                    candidates.append({
                        "plate_number": final_plate,
                        "plate_type": f"{plate_type} ({'Moto' if vtype == 'MOTO' else 'Carro'})",
                        "confidence": 0.95,
                        "bbox": (off_x + px, off_y + py, pw, ph),
                        "plate_patch": plate_patch
                    })

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
        1. Cleans and normalizes plate string with strict validation.
        2. Queries database for registered vehicle info.
        3. Records detection in plate_detection_logs.
        4. Broadcasts real-time WebSocket alert for Android TV PiP & Web Panel.
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
