import time
import cv2
import numpy as np
from datetime import datetime

def generate_synthetic_video_feed(output_path="test_feed.mp4", duration_seconds=15, fps=20):
    """
    Generates a synthetic test video clip with moving rectangles and timestamps,
    useful for verifying the detection pipeline without a physical RTSP camera.
    """
    width, height = 1280, 720
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = duration_seconds * fps
    rect_x = 50

    for i in range(total_frames):
        # Base background with grid pattern
        frame = np.full((height, width, 3), 40, dtype=np.uint8)
        
        # Grid lines
        for y in range(0, height, 80):
            cv2.line(frame, (0, y), (width, y), (60, 60, 60), 1)
        for x in range(0, width, 80):
            cv2.line(frame, (x, 0), (x, height), (60, 60, 60), 1)

        # Move object between frame 60 and 200 (seconds 3 to 10)
        if 60 <= i <= 200:
            rect_x += 6
            cv2.rectangle(frame, (rect_x, 300), (rect_x + 120, 480), (0, 200, 255), -1)
            cv2.putText(frame, "MOVING INTRUDER", (rect_x - 20, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

        # Watermark
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        cv2.putText(frame, f"TEST FEED - {timestamp_str}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        cv2.putText(frame, f"Frame: {i}/{total_frames}", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        out.write(frame)

    out.release()
    print(f"Generated synthetic test video: {output_path} ({total_frames} frames)")

if __name__ == "__main__":
    generate_synthetic_video_feed()
