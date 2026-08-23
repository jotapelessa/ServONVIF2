from typing import List, Tuple, Optional
import cv2
import numpy as np
from loguru import logger

class MotionDetector:
    """
    OpenCV-based Motion Detector using MOG2 with Pre-Masking Isolation and Contour Validation.
    Everything outside the ROI is completely masked to black before MOG2, preventing any external motion,
    shadows, or lighting changes from triggering alarms.
    """
    def __init__(
        self,
        roi_polygon: Optional[List[List[float]]] = None,
        sensitivity: float = 0.03,
        history: int = 400,
        var_threshold: float = 25.0, # Increased threshold to filter subtle noise
        detect_shadows: bool = False
    ):
        self.sensitivity = max(0.01, min(0.20, sensitivity))
        self.roi_polygon = roi_polygon  # Normalized coordinates [[0.1, 0.2], ...]
        self.roi_mask: Optional[np.ndarray] = None
        self._mask_dimensions: Tuple[int, int] = (0, 0)

        # Initialize MOG2 Subtractor
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=history,
            varThreshold=var_threshold,
            detectShadows=detect_shadows
        )

        # Morphological Kernel for noise reduction (Opening + Closing)
        self.open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        self.dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))

    def update_roi_polygon(self, roi_polygon: Optional[List[List[float]]]) -> None:
        self.roi_polygon = roi_polygon
        self.roi_mask = None
        self._mask_dimensions = (0, 0)
        logger.info(f"Updated ROI polygon: {roi_polygon}")

    def _get_roi_mask(self, width: int, height: int) -> Optional[np.ndarray]:
        if (width, height) == self._mask_dimensions and self.roi_mask is not None:
            return self.roi_mask

        if not self.roi_polygon or len(self.roi_polygon) < 3:
            self.roi_mask = None
            self._mask_dimensions = (width, height)
            return None

        # Convert normalized coordinates [0..1] to pixel points
        points = []
        for pt in self.roi_polygon:
            px = int(round(pt[0] * width))
            py = int(round(pt[1] * height))
            points.append([px, py])

        pts = np.array([points], dtype=np.int32)
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(mask, pts, 255)

        self.roi_mask = mask
        self._mask_dimensions = (width, height)
        return self.roi_mask

    def process_frame(self, frame_bgr: np.ndarray) -> Tuple[bool, float, List[Tuple[int, int, int, int]]]:
        """
        Processes a downscaled BGR frame.
        Guarantees 0% false positives from areas outside the ROI polygon.
        """
        h, w = frame_bgr.shape[:2]
        roi_mask = self._get_roi_mask(w, h)

        # 1. PRE-MASKING: Isolate ROI BEFORE background subtraction
        if roi_mask is not None:
            # Mask the input image so everything outside the ROI is completely black
            processed_input = cv2.bitwise_and(frame_bgr, frame_bgr, mask=roi_mask)
            roi_pixels = cv2.countNonZero(roi_mask)
            total_active_pixels = roi_pixels if roi_pixels > 0 else (w * h)
        else:
            processed_input = frame_bgr
            total_active_pixels = w * h

        # 2. Apply MOG2 on isolated ROI frame
        fg_mask = self.bg_subtractor.apply(processed_input)

        # 3. POST-MASKING: Strict bitwise-AND to guarantee clean boundary
        if roi_mask is not None:
            fg_mask = cv2.bitwise_and(fg_mask, roi_mask)

        # 4. Morphological noise filtering
        # Remove small isolated pixels (noise/glitches)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, self.open_kernel)
        # Connect nearby solid blobs
        fg_mask = cv2.dilate(fg_mask, self.dilate_kernel, iterations=1)

        # 5. Extract significant contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = []
        valid_motion_pixels = 0

        # Minimum contour size to qualify as a person/object (not compression artifact)
        min_contour_area = max(120.0, total_active_pixels * (self.sensitivity * 0.35))

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= min_contour_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                bounding_boxes.append((x, y, bw, bh))
                valid_motion_pixels += int(area)

        motion_score = float(valid_motion_pixels) / float(total_active_pixels) if total_active_pixels > 0 else 0.0
        is_motion = len(bounding_boxes) > 0 and (motion_score >= (self.sensitivity * 0.6))

        return is_motion, motion_score, bounding_boxes
