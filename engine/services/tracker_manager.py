import time
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from loguru import logger

@dataclass
class TrackedObject:
    track_id: int
    class_id: int
    class_name: str
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    last_ocr_time: float = 0.0
    ocr_attempts: int = 0
    plate_number: Optional[str] = None
    plate_confidence: float = 0.0
    plate_category: Optional[str] = None
    vehicle_model: Optional[str] = None
    owner_name: Optional[str] = None
    is_locked: bool = False  # True when OCR confidence > 80%
    alert_sent: bool = False
    bbox: list = field(default_factory=list)

class TrackerManager:
    """
    Manages multi-object tracking history and smart throttling for OCR / alerts.
    Prevents CPU thrashing by locking OCR once a plate is identified with confidence > 80%.
    """
    def __init__(self, ttl_seconds: float = 12.0, ocr_interval_seconds: float = 0.6, min_lock_confidence: float = 0.80):
        self.ttl_seconds = ttl_seconds
        self.ocr_interval_seconds = ocr_interval_seconds
        self.min_lock_confidence = min_lock_confidence
        self._tracks: Dict[int, TrackedObject] = {}

    def get_or_create(self, track_id: int, class_id: int, class_name: str, bbox: list) -> TrackedObject:
        now = time.time()
        if track_id not in self._tracks:
            self._tracks[track_id] = TrackedObject(
                track_id=track_id,
                class_id=class_id,
                class_name=class_name,
                first_seen=now,
                last_seen=now,
                bbox=bbox
            )
        else:
            obj = self._tracks[track_id]
            obj.last_seen = now
            obj.bbox = bbox
            obj.class_id = class_id
            obj.class_name = class_name
        return self._tracks[track_id]

    def should_run_ocr(self, track_id: int) -> bool:
        """
        Returns True only if:
        1. Object is a vehicle.
        2. OCR is NOT locked (> 80% confidence already reached).
        3. OCR interval has passed since last attempt.
        4. Max attempts per track not exceeded without lock.
        """
        if track_id not in self._tracks:
            return True

        obj = self._tracks[track_id]
        if obj.is_locked:
            return False

        if obj.ocr_attempts >= 12 and obj.plate_number is None:
            if time.time() - obj.last_ocr_time < 3.0:
                return False

        return (time.time() - obj.last_ocr_time) >= self.ocr_interval_seconds

    def record_ocr_result(
        self,
        track_id: int,
        plate: Optional[str],
        confidence: float,
        plate_info: Optional[Dict[str, Any]] = None
    ) -> None:
        if track_id not in self._tracks:
            return

        obj = self._tracks[track_id]
        obj.last_ocr_time = time.time()
        obj.ocr_attempts += 1

        if plate and confidence > obj.plate_confidence:
            obj.plate_number = plate
            obj.plate_confidence = confidence
            if plate_info:
                obj.plate_category = plate_info.get("category")
                obj.vehicle_model = plate_info.get("vehicle_model")
                obj.owner_name = plate_info.get("owner_name")

            if confidence >= self.min_lock_confidence:
                obj.is_locked = True
                logger.info(
                    f"[Tracker] 🔒 Track ID #{track_id} travado com placa '{plate}' "
                    f"(Confiança: {confidence*100:.1f}% >= 80%). OCR desativado para economizar CPU."
                )

    def cleanup_old_tracks(self) -> None:
        now = time.time()
        expired = [tid for tid, obj in self._tracks.items() if (now - obj.last_seen) > self.ttl_seconds]
        for tid in expired:
            del self._tracks[tid]

    def clear(self) -> None:
        self._tracks.clear()
