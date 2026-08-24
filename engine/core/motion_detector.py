from typing import List, Tuple, Optional
import cv2
import numpy as np
from loguru import logger

class MotionDetector:
    """
    OpenCV-based Motion Detector using MOG2 with Dual-Zone Masking (ROI + Ignore Exclusion Zones)
    and Anti-False-Positive Morphological Filtering.

    - Cyan Detection Zone (roi_polygon): Motion is ONLY monitored inside this area.
    - Purple Ignore Zones (ignore_polygons): Motion in these areas (trees, roads, reflections) is 100% ignored.
    - Sensitivity Scale: 0 to 50 (0 = Disabled, 1-15 = Strict Anti-Noise, 20 = Balanced Default, 35-50 = High).
    """
    def __init__(
        self,
        roi_polygon: Optional[List[List[float]]] = None,
        ignore_polygons: Optional[List[List[List[float]]]] = None,
        sensitivity: float = 20.0,
        history: int = 500,
        var_threshold: float = 36.0,  # Strict threshold to eliminate camera sensor noise and pixel jitter
        detect_shadows: bool = False
    ):
        # Normalize sensitivity on 0-50 scale
        if 0 < sensitivity < 1.0:
            self.sensitivity = min(50.0, max(1.0, sensitivity * 500.0))
        else:
            self.sensitivity = max(0.0, min(50.0, float(sensitivity)))

        self.roi_polygon = roi_polygon
        self.ignore_polygons = ignore_polygons or []
        self.effective_mask: Optional[np.ndarray] = None
        self._mask_dimensions: Tuple[int, int] = (0, 0)

        # Initialize MOG2 Background Subtractor with high stability
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=history,
            varThreshold=var_threshold,
            detectShadows=detect_shadows
        )

        # Morphological Kernels for strict noise suppression
        self.open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        self.close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        self.dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))

    def update_roi_polygon(self, roi_polygon: Optional[List[List[float]]]) -> None:
        self.roi_polygon = roi_polygon
        self.effective_mask = None
        self._mask_dimensions = (0, 0)
        logger.info(f"Updated Detection ROI polygon: {roi_polygon}")

    def update_ignore_polygons(self, ignore_polygons: Optional[List[List[List[float]]]]) -> None:
        self.ignore_polygons = ignore_polygons or []
        self.effective_mask = None
        self._mask_dimensions = (0, 0)
        logger.info(f"Updated Purple Ignore zones count: {len(self.ignore_polygons)}")

    def update_zones(
        self,
        roi_polygon: Optional[List[List[float]]] = None,
        ignore_polygons: Optional[List[List[List[float]]]] = None,
        sensitivity: Optional[float] = None
    ) -> None:
        self.roi_polygon = roi_polygon
        self.ignore_polygons = ignore_polygons or []
        if sensitivity is not None:
            if 0 < sensitivity < 1.0:
                self.sensitivity = min(50.0, max(1.0, sensitivity * 500.0))
            else:
                self.sensitivity = max(0.0, min(50.0, float(sensitivity)))
        self.effective_mask = None
        self._mask_dimensions = (0, 0)
        logger.info(f"Updated Camera Zones: ROI={bool(roi_polygon)}, IgnoreZones={len(self.ignore_polygons)}, Sens={self.sensitivity}")

    def _get_effective_mask(self, width: int, height: int) -> Optional[np.ndarray]:
        if (width, height) == self._mask_dimensions and self.effective_mask is not None:
            return self.effective_mask

        # 1. Base ROI Mask (Cyan Zone)
        if self.roi_polygon and len(self.roi_polygon) >= 3:
            roi_points = []
            for pt in self.roi_polygon:
                px = int(round(pt[0] * width))
                py = int(round(pt[1] * height))
                roi_points.append([px, py])
            pts = np.array([roi_points], dtype=np.int32)
            roi_mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(roi_mask, pts, 255)
        else:
            # Full screen active if no specific polygon
            roi_mask = np.full((height, width), 255, dtype=np.uint8)

        # 2. Ignore / Exclusion Masks (Purple Zones)
        if self.ignore_polygons and len(self.ignore_polygons) > 0:
            ignore_mask = np.zeros((height, width), dtype=np.uint8)
            for poly in self.ignore_polygons:
                if len(poly) >= 3:
                    ign_points = []
                    for pt in poly:
                        px = int(round(pt[0] * width))
                        py = int(round(pt[1] * height))
                        ign_points.append([px, py])
                    pts = np.array([ign_points], dtype=np.int32)
                    cv2.fillPoly(ignore_mask, pts, 255)
            # Subtract ignore mask completely from active ROI
            effective_mask = cv2.bitwise_and(roi_mask, cv2.bitwise_not(ignore_mask))
        else:
            effective_mask = roi_mask

        self.effective_mask = effective_mask
        self._mask_dimensions = (width, height)
        return self.effective_mask

    def process_frame(self, frame_bgr: np.ndarray) -> Tuple[bool, float, List[Tuple[int, int, int, int]]]:
        """
        Processes a downscaled BGR frame with strict spatial filtering.
        Guarantees 0% false positives from areas outside the ROI or inside Purple Ignore Zones.
        """
        # If sensitivity is 0, detection is completely disabled
        if self.sensitivity <= 0.0:
            return False, 0.0, []

        h, w = frame_bgr.shape[:2]
        effective_mask = self._get_effective_mask(w, h)

        # 1. PRE-MASKING: Isolate active pixels before MOG2
        if effective_mask is not None:
            processed_input = cv2.bitwise_and(frame_bgr, frame_bgr, mask=effective_mask)
            active_pixels = cv2.countNonZero(effective_mask)
            total_active_pixels = active_pixels if active_pixels > 0 else (w * h)
        else:
            processed_input = frame_bgr
            total_active_pixels = w * h

        # 2. Apply MOG2 background subtraction on isolated pixels
        fg_mask = self.bg_subtractor.apply(processed_input)

        # 3. POST-MASKING: Hard bitwise-AND to guarantee zero leaking outside boundaries
        if effective_mask is not None:
            fg_mask = cv2.bitwise_and(fg_mask, effective_mask)

        # 4. Strict Morphological Noise Filtering
        # Morphological OPENING: removes single isolated noise pixels and line artifacts
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, self.open_kernel)
        # Morphological CLOSING: solidifies genuine moving bodies
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, self.close_kernel)

        # 5. Extract significant motion contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = []
        valid_motion_pixels = 0

        # Sensitivity formula:
        # Scale 0 - 50:
        # sens=1  -> area_factor ~ 0.0070 (requires ~0.7% screen blob, ultra strict)
        # sens=20 -> area_factor ~ 0.0040 (requires ~0.4% screen blob, balanced)
        # sens=50 -> area_factor ~ 0.0008 (requires ~0.08% screen blob, sensitive)
        sens_clamped = max(1.0, min(50.0, self.sensitivity))
        area_factor = max(0.0006, (51.0 - sens_clamped) * 0.00014)
        min_contour_area = max(140.0, total_active_pixels * area_factor)
        score_threshold = max(0.0025, (51.0 - sens_clamped) * 0.00045)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= min_contour_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                # Verify centroid is inside effective mask
                cx, cy = x + bw // 2, y + bh // 2
                if 0 <= cx < w and 0 <= cy < h:
                    if effective_mask is None or effective_mask[cy, cx] > 0:
                        bounding_boxes.append((x, y, bw, bh))
                        valid_motion_pixels += int(area)

        motion_score = float(valid_motion_pixels) / float(total_active_pixels) if total_active_pixels > 0 else 0.0
        is_motion = len(bounding_boxes) > 0 and (motion_score >= score_threshold)

        return is_motion, motion_score, bounding_boxes
