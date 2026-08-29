import os
import time
import platform
from typing import List, Tuple, Optional, Dict, Any
import cv2
import numpy as np
import torch
from loguru import logger
from ultralytics import YOLO

from engine.services.tracker_manager import TrackerManager
from engine.services.lpr_engine import LPREngine

class VisionPipeline:
    """
    Modern 2-Stage Vision Pipeline for ServONVIF:
    - Stage 1: Ultralytics YOLO (v8n/11n) Multi-Object Tracking (Person, Car, Motorcycle, Bus, Truck).
    - Stage 2: Vehicle ROI Crop Extraction + RapidOCR/PaddleOCR for Brazilian Mercosul & Standard plates.
    - Automatic hardware acceleration:
        * Apple Silicon MPS (Metal) on macOS (MacBook Air M4).
        * Intel CPU / OpenVINO on Intel Jasper Lake (Celeron N5105).
    """

    # COCO Class mapping
    # 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck
    TARGET_CLASSES = [0, 2, 3, 5, 7]
    VEHICLE_CLASSES = {2: "Carro", 3: "Moto", 5: "Ônibus", 7: "Caminhão"}
    PERSON_CLASSES = {0: "Pessoa"}

    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self.device = self._detect_optimal_device()
        self.tracker_manager = TrackerManager(ttl_seconds=12.0, ocr_interval_seconds=0.5, min_lock_confidence=0.80)
        
        # Load YOLO model
        logger.info(f"[Vision Pipeline] 🧠 Carregando modelo YOLO ({model_name}) no dispositivo '{self.device}'...")
        self.model = YOLO(model_name)
        
        # Warmup model once
        dummy = np.zeros((360, 640, 3), dtype=np.uint8)
        try:
            self.model.predict(dummy, device=self.device, verbose=False)
            logger.success(f"[Vision Pipeline] 🚀 Pipeline de IA inicializado e acelerado via [{self.device.upper()}]")
        except Exception as e:
            logger.warning(f"[Vision Pipeline] Fallback de dispositivo para CPU: {e}")
            self.device = "cpu"
            self.model.predict(dummy, device="cpu", verbose=False)

    def _detect_optimal_device(self) -> str:
        """
        Auto-detects optimal hardware execution provider:
        - Apple Silicon M4/M3/M2/M1 -> MPS (Metal Performance Shaders)
        - Intel Celeron N5105 / x86_64 -> CPU with AVX2 & capped thread usage
        """
        if torch.backends.mps.is_available():
            logger.info("[Vision Pipeline] 🍏 Hardware Apple Silicon detectado (Aceleração Metal MPS ativada)")
            return "mps"
        
        # Intel / AMD / Generic CPU
        cpu_count = os.cpu_count() or 4
        threads_to_use = max(1, min(2, cpu_count - 1))
        torch.set_num_threads(threads_to_use)
        logger.info(f"[Vision Pipeline] ⚡ Hardware Intel/x86 detectado (N5105 Mode: {threads_to_use} threads)")
        return "cpu"

    def is_point_in_polygon(self, pt: Tuple[int, int], polygon: List[List[float]], width: int, height: int) -> bool:
        if not polygon or len(polygon) < 3:
            return True
        pts = []
        for p in polygon:
            px = int(round(p[0] * width)) if p[0] <= 1.0 else int(p[0])
            py = int(round(p[1] * height)) if p[1] <= 1.0 else int(p[1])
            pts.append([px, py])
        pts_arr = np.array(pts, dtype=np.int32)
        pt_float = (float(pt[0]), float(pt[1]))
        return cv2.pointPolygonTest(pts_arr, pt_float, False) >= 0

    def is_bbox_in_zone(
        self,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        roi_polygon: Optional[List[List[float]]],
        ignore_polygons: Optional[List[List[List[float]]]],
        width: int,
        height: int
    ) -> bool:
        """
        Determines if a bounding box is in the valid detection zone:
        - Ground base point (cx, y2) and center (cx, cy) are evaluated.
        - Purple Ignore Zones strictly suppress foliage, streets, and neighbor areas.
        - Cyan ROI Zone restricts detection to the designated perimeter.
        """
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        base_y = max(0, min(height - 1, y2 - 6))
        base_pt = (cx, base_y)
        center_pt = (cx, cy)

        # 1. Check Purple Ignore Zones first (strict noise suppression)
        if ignore_polygons:
            for ig_poly in ignore_polygons:
                if ig_poly and len(ig_poly) >= 3:
                    # If feet/base or center is in the ignore zone, suppress
                    if (self.is_point_in_polygon(base_pt, ig_poly, width, height) or 
                        self.is_point_in_polygon(center_pt, ig_poly, width, height)):
                        return False

        # 2. Check Cyan ROI Polygon (if configured)
        if roi_polygon and len(roi_polygon) >= 3:
            in_roi = (
                self.is_point_in_polygon(base_pt, roi_polygon, width, height) or
                self.is_point_in_polygon(center_pt, roi_polygon, width, height)
            )
            return in_roi

        # 3. If no ROI is configured and not in ignore zone, allow detection
        return True

    def process_frame(
        self,
        camera_id: int,
        camera_name: str,
        frame_bgr: np.ndarray,
        roi_polygon: Optional[List[List[float]]] = None,
        ignore_polygons: Optional[List[List[List[float]]]] = None,
        sensitivity: float = 20.0
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[Dict[str, Any]], Optional[np.ndarray]]:
        """
        Executes 2-Stage Vision Pipeline on a single frame:
        1. YOLO Object Detection & Persistent Multi-Object Tracking.
        2. Zone Masking (ROI + Ignore Exclusion Zones).
        3. Person presence detection & Vehicle ROI extraction.
        4. Stage 2 OCR for vehicles (rate-limited and locked at >80% confidence).

        Returns:
            has_event (bool): True if person, moving vehicle or plate is present.
            detections (list): Formatted bounding boxes and metadata.
            plate_payload (dict or None): Any newly extracted or validated plate info.
            vehicle_crop (ndarray or None): Cropped snapshot of vehicle if plate was read.
        """
        if frame_bgr is None or frame_bgr.size == 0 or sensitivity <= 0:
            return False, [], None, None

        h, w = frame_bgr.shape[:2]
        self.tracker_manager.cleanup_old_tracks()

        # Minimum confidence threshold adjusted by sensitivity (20 is default 0.35)
        conf_thresh = max(0.20, min(0.65, 0.55 - (sensitivity / 100.0)))

        # 1. Run YOLO Tracking (classes: person=0, car=2, moto=3, bus=5, truck=7)
        try:
            results = self.model.track(
                frame_bgr,
                persist=True,
                tracker="bytetrack.yaml",
                classes=self.TARGET_CLASSES,
                conf=conf_thresh,
                device=self.device,
                verbose=False
            )
        except Exception as e:
            logger.debug(f"[Vision Pipeline] Track inference error: {e}")
            return False, [], None, None

        if not results or len(results) == 0:
            return False, [], None, None

        res = results[0]
        boxes = res.boxes
        if boxes is None or len(boxes) == 0:
            return False, [], None, None

        has_event = False
        detections: List[Dict[str, Any]] = []
        latest_plate_payload: Optional[Dict[str, Any]] = None
        latest_vehicle_crop: Optional[np.ndarray] = None

        for box in boxes:
            cls_id = int(box.cls[0].item()) if box.cls is not None else -1
            conf = float(box.conf[0].item()) if box.conf is not None else 0.0
            track_id = int(box.id[0].item()) if (box.id is not None and len(box.id) > 0) else -1
            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            x1, y1, x2, y2 = max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])
            bw, bh = x2 - x1, y2 - y1

            if bw < 20 or bh < 20:
                continue

            # Check Zone Membership (Cyan ROI Priority over Purple Ignore)
            if not self.is_bbox_in_zone(x1, y1, x2, y2, roi_polygon, ignore_polygons, w, h):
                continue

            # Valid detection in active zone
            has_event = True
            is_person = (cls_id == 0)
            is_vehicle = (cls_id in self.VEHICLE_CLASSES)
            cls_name = self.PERSON_CLASSES.get(cls_id, self.VEHICLE_CLASSES.get(cls_id, "Objeto"))

            # Update Tracker State
            track_obj = self.tracker_manager.get_or_create(
                track_id=track_id if track_id >= 0 else int(time.time() * 1000) % 100000,
                class_id=cls_id,
                class_name=cls_name,
                bbox=[x1, y1, bw, bh]
            )

            # Stage 2: Vehicle LPR Processing (if vehicle and not locked)
            if is_vehicle and self.tracker_manager.should_run_ocr(track_obj.track_id):
                # Extract vehicle ROI crop
                vehicle_crop = frame_bgr[y1:y2, x1:x2]
                ocr_result = LPREngine.scan_vehicle_crop(vehicle_crop)

                if ocr_result:
                    plate_num, plate_type, plate_conf, plate_patch = ocr_result
                    self.tracker_manager.record_ocr_result(
                        track_id=track_obj.track_id,
                        plate=plate_num,
                        confidence=plate_conf
                    )
                    latest_plate_payload = {
                        "plate_number": plate_num,
                        "plate_type": plate_type,
                        "confidence": plate_conf,
                        "vehicle_type": cls_name,
                        "track_id": track_obj.track_id,
                        "bbox": (x1, y1, bw, bh)
                    }
                    latest_vehicle_crop = vehicle_crop

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 2),
                "track_id": track_obj.track_id,
                "bbox": (x1, y1, bw, bh),
                "plate_number": track_obj.plate_number,
                "is_locked": track_obj.is_locked
            })

        return has_event, detections, latest_plate_payload, latest_vehicle_crop

# Global singleton pipeline instance
vision_pipeline = VisionPipeline()

