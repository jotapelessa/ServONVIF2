import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Optional
import cv2
import numpy as np
from loguru import logger
from engine.config.settings import settings

class MediaWriter:
    """
    Handles saving event media:
    - MP4 clips organized by CameraID/YYYY-MM-DD/HH-MM-SS_event.mp4 with H.264 and +faststart
    - JPEG thumbnails with timestamp and optional motion bounding boxes
    """
    @staticmethod
    def get_event_directory(camera_id: int, date_obj: datetime) -> Path:
        date_str = date_obj.strftime("%Y-%m-%d")
        cam_dir = settings.MEDIA_DIR / f"camera_{camera_id}" / date_str
        cam_dir.mkdir(parents=True, exist_ok=True)
        return cam_dir

    @staticmethod
    def save_thumbnail(
        camera_id: int,
        timestamp: datetime,
        frame_bgr: np.ndarray,
        bounding_boxes: Optional[List[Tuple[int, int, int, int]]] = None
    ) -> str:
        cam_dir = MediaWriter.get_event_directory(camera_id, timestamp)
        time_str = timestamp.strftime("%H-%M-%S")
        thumb_filename = f"{time_str}_thumb.jpg"
        thumb_path = cam_dir / thumb_filename

        output_frame = frame_bgr.copy()
        if bounding_boxes:
            for (x, y, w, h) in bounding_boxes:
                cv2.rectangle(output_frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

        # Add timestamp watermark
        cv2.putText(
            output_frame,
            timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
            cv2.LINE_AA
        )

        cv2.imwrite(str(thumb_path), output_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return str(thumb_path)

    @staticmethod
    def save_video_clip(
        camera_id: int,
        timestamp: datetime,
        frames: List[np.ndarray],
        fps: float = 20.0
    ) -> Optional[str]:
        if not frames:
            return None

        # Sanitize FPS (cameras reporting 90000 RTP clock are clamped to 20.0)
        if fps <= 0 or np.isnan(fps) or fps > 60:
            fps = 20.0

        cam_dir = MediaWriter.get_event_directory(camera_id, timestamp)
        time_str = timestamp.strftime("%H-%M-%S")
        video_filename = f"{time_str}_event.mp4"
        video_path = cam_dir / video_filename
        temp_video_path = cam_dir / f"temp_{time_str}.mp4"

        h, w = frames[0].shape[:2]

        # Write initial video with OpenCV
        try:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(str(temp_video_path), fourcc, fps, (w, h))
            if not writer.isOpened():
                fourcc = cv2.VideoWriter_fourcc(*'avc1')
                writer = cv2.VideoWriter(str(temp_video_path), fourcc, fps, (w, h))

            for frame in frames:
                writer.write(frame)
            writer.release()
        except Exception as e:
            logger.error(f"Error during OpenCV video writing: {e}")
            return None

        # Post-process with FFmpeg for browser compatibility (H.264 + yuv420p + faststart)
        ffmpeg_bin = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        if ffmpeg_bin and Path(ffmpeg_bin).exists() and temp_video_path.exists():
            try:
                cmd = [
                    ffmpeg_bin, "-y",
                    "-i", str(temp_video_path),
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    "-r", str(int(fps)),
                    str(video_path)
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                temp_video_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"FFmpeg optimization failed, falling back to temp file: {e}")
                temp_video_path.rename(video_path)
        else:
            if temp_video_path.exists():
                temp_video_path.rename(video_path)

        duration_sec = len(frames) / fps
        logger.info(f"Saved event clip: {video_path} ({len(frames)} frames @ {fps:.1f}fps = {duration_sec:.1f}s)")
        return str(video_path)
