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
        history: int = 400,
        var_threshold: float = 40.0,  # High stability against camera sensor jitter
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
        self.open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        self.close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))

        # Anti-Lighting Jump & Temporal Consistency State
        self._prev_luma: Optional[float] = None
        self._consecutive_motion_count: int = 0
        self._light_shock_cooldown_frames: int = 0

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
        Processes a downscaled BGR frame with:
        1. Strict Dual-Zone Isolation (Zero false positives from Ignore Zones).
        2. Global Illumination Shock Compensation (Lamps turning on/off, headlights, reflections).
        3. 2-Frame Temporal Consistency Check.
        """
        if self.sensitivity <= 0.0:
            return False, 0.0, []

        h, w = frame_bgr.shape[:2]
        effective_mask = self._get_effective_mask(w, h)

        # Calculate active area
        active_pixels = cv2.countNonZero(effective_mask) if effective_mask is not None else (w * h)
        total_active_pixels = max(active_pixels, 1)

        # 1. Global Illumination / Light Switch Detection
        # Compute mean luminance in the active ROI to detect instantaneous scene brightness shifts
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        current_luma = float(cv2.mean(gray, mask=effective_mask)[0])

        is_light_shock = False
        if self._prev_luma is not None:
            luma_delta = abs(current_luma - self._prev_luma)
            # Sudden scene-wide illumination jump (> 14.0 luma units in a single frame)
            if luma_delta > 14.0:
                is_light_shock = True
                self._light_shock_cooldown_frames = 3
                logger.debug(f"💡 Global light switch detected (ΔLuma={luma_delta:.1f}). Suppressing false alarm.")

        self._prev_luma = current_luma

        # 2. Pre-masking input image before MOG2
        if effective_mask is not None:
            processed_input = cv2.bitwise_and(frame_bgr, frame_bgr, mask=effective_mask)
        else:
            processed_input = frame_bgr

        # Fast background adaptation during light shock (adapts model in 2 frames without alarm)
        learning_rate = 0.35 if (is_light_shock or self._light_shock_cooldown_frames > 0) else -1
        if self._light_shock_cooldown_frames > 0:
            self._light_shock_cooldown_frames -= 1

        fg_mask = self.bg_subtractor.apply(processed_input, learningRate=learning_rate)

        # If a light shock just occurred, discard motion entirely
        if is_light_shock:
            self._consecutive_motion_count = 0
            return False, 0.0, []

        # 3. Double-Layer Masking (Pre-Morphology AND Post-Morphology)
        # Guarantees that morphological dilation NEVER bleeds across the Purple Ignore boundary
        if effective_mask is not None:
            fg_mask = cv2.bitwise_and(fg_mask, effective_mask)

        # 4. Strict Morphological Filtering
        # Open to eliminate camera noise specks
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, self.open_kernel)
        # Close to join connected body parts
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, self.close_kernel)

        # Re-apply effective mask after morphology to cut any dilated boundary pixels
        if effective_mask is not None:
            fg_mask = cv2.bitwise_and(fg_mask, effective_mask)

        # Check for massive screen-wide foreground flood (typical of global exposure changes)
        total_fg_pixels = cv2.countNonZero(fg_mask)
        raw_fg_ratio = float(total_fg_pixels) / float(total_active_pixels)
        if raw_fg_ratio > 0.40:
            # More than 40% of the entire monitored area changed at once -> global light change
            self._consecutive_motion_count = 0
            return False, 0.0, []

        # 5. Extract significant motion contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = []
        valid_motion_pixels = 0

        # Sensitivity formula:
        sens_clamped = max(1.0, min(50.0, self.sensitivity))
        area_factor = max(0.0006, (51.0 - sens_clamped) * 0.00014)
        min_contour_area = max(120.0, total_active_pixels * area_factor)
        score_threshold = max(0.0020, (51.0 - sens_clamped) * 0.00040)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= min_contour_area:
                x, y, bw, bh = cv2.boundingRect(cnt)

                # Strict Overlap Verification: Ensure contour is predominantly inside the active zone
                if effective_mask is not None:
                    roi_slice = effective_mask[y:y+bh, x:x+bw]
                    if roi_slice.size > 0:
                        active_overlap = cv2.countNonZero(roi_slice) / float(roi_slice.size)
                        if active_overlap < 0.50:
                            # Discard contour if more than 50% is in the ignore zone
                            continue
                else:
                    cx, cy = x + bw // 2, y + bh // 2
                    if not (0 <= cx < w and 0 <= cy < h):
                        continue

                bounding_boxes.append((x, y, bw, bh))
                valid_motion_pixels += int(area)

        motion_score = float(valid_motion_pixels) / float(total_active_pixels)
        raw_detection = len(bounding_boxes) > 0 and (motion_score >= score_threshold)

        # 6. Temporal Consistency (2-Frame Filter)
        # Prevents 1-frame transient flashes from triggering false alarms
        if raw_detection:
            self._consecutive_motion_count += 1
        else:
            self._consecutive_motion_count = 0

        is_motion = (self._consecutive_motion_count >= 2)

        return is_motion, motion_score, bounding_boxes
