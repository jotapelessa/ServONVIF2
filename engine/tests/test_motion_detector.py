import numpy as np
import pytest
from engine.core.motion_detector import MotionDetector

def test_motion_detector_static_frames():
    detector = MotionDetector(sensitivity=0.05)
    
    # Static background (all zeros)
    static_frame = np.zeros((360, 640, 3), dtype=np.uint8)
    
    # Prime background model
    for _ in range(5):
        detector.process_frame(static_frame)

    # Static frame should yield no motion
    is_motion, score, _ = detector.process_frame(static_frame)
    assert not is_motion
    assert score == 0.0

def test_motion_detector_with_motion():
    detector = MotionDetector(sensitivity=0.02)
    static_frame = np.zeros((360, 640, 3), dtype=np.uint8)
    
    for _ in range(10):
        detector.process_frame(static_frame)

    # Introduce a big white square in the center
    motion_frame = static_frame.copy()
    motion_frame[100:260, 200:440] = 255 # Large moving object

    is_motion, score, bboxes = detector.process_frame(motion_frame)
    assert is_motion
    assert score > 0.02
    assert len(bboxes) > 0

def test_motion_detector_roi_filtering():
    # ROI covers only top-left quadrant [0..0.5, 0..0.5]
    roi = [[0.0, 0.0], [0.5, 0.0], [0.5, 0.5], [0.0, 0.5]]
    detector = MotionDetector(roi_polygon=roi, sensitivity=0.03)

    static_frame = np.zeros((360, 640, 3), dtype=np.uint8)
    for _ in range(5):
        detector.process_frame(static_frame)

    # Introduce motion in bottom-right quadrant [300..350, 500..600] outside ROI
    motion_frame = static_frame.copy()
    motion_frame[300:350, 500:600] = 255

    is_motion, score, _ = detector.process_frame(motion_frame)
    # Motion outside ROI should be ignored
    assert not is_motion
