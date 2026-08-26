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

        # Watermark & Bounding Boxes
        if getattr(settings, "TELEGRAM_WATERMARK_ENABLED", True):
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

        # Photo Quality & Scaling: "minima" (640px), "media" (1280px HD), "maxima" (Native 5MP)
        quality_mode = getattr(settings, "TELEGRAM_PHOTO_QUALITY", "media").lower()
        jpeg_quality = 85
        h, w = output_frame.shape[:2]

        if quality_mode == "minima":
            jpeg_quality = 70
            if w > 640:
                scale = 640.0 / w
                output_frame = cv2.resize(output_frame, (640, int(h * scale)), interpolation=cv2.INTER_AREA)
        elif quality_mode == "media":
            jpeg_quality = 85
            if w > 1280:
                scale = 1280.0 / w
                output_frame = cv2.resize(output_frame, (1280, int(h * scale)), interpolation=cv2.INTER_AREA)
        elif quality_mode == "maxima":
            jpeg_quality = 95
            # Preserves full native sensor resolution (e.g., 5MP 2560x1920)

        cv2.imwrite(str(thumb_path), output_frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
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

        # Sanitize FPS (clamped between 5.0 and 60.0, rounded to 2 decimal places)
        if fps <= 0 or np.isnan(fps) or fps > 60:
            fps = 20.0
        fps = round(float(fps), 2)

        cam_dir = MediaWriter.get_event_directory(camera_id, timestamp)
        time_str = timestamp.strftime("%H-%M-%S")
        video_filename = f"{time_str}_event.mp4"
        video_path = cam_dir / video_filename

        h, w = frames[0].shape[:2]
        ffmpeg_bin = (
            shutil.which("ffmpeg")
            or ("/opt/homebrew/bin/ffmpeg" if Path("/opt/homebrew/bin/ffmpeg").exists() else None)
            or ("/usr/local/bin/ffmpeg" if Path("/usr/local/bin/ffmpeg").exists() else None)
            or ("/usr/bin/ffmpeg" if Path("/usr/bin/ffmpeg").exists() else None)
        )

        success = False

        # Adaptive Quality based on TELEGRAM_PHOTO_QUALITY
        quality_mode = getattr(settings, "TELEGRAM_PHOTO_QUALITY", "media").lower()
        if quality_mode == "maxima":
            crf_val = "17"  # Studio Broadcast / Visually Lossless
            preset_val = "fast"
        elif quality_mode == "minima":
            crf_val = "28"  # Ultra Compressed
            preset_val = "veryfast"
        else:
            crf_val = "21"  # Balanced High Quality
            preset_val = "veryfast"

        # Approach 1: Direct FFmpeg stdin pipe (lossless, zero-lag, instant H.264 +faststart CFR)
        if ffmpeg_bin:
            try:
                cmd = [
                    ffmpeg_bin, "-y",
                    "-f", "rawvideo",
                    "-vcodec", "rawvideo",
                    "-s", f"{w}x{h}",
                    "-pix_fmt", "bgr24",
                    "-r", f"{fps:.2f}",
                    "-i", "-",
                    "-c:v", "libx264",
                    "-preset", preset_val,
                    "-crf", crf_val,
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    str(video_path)
                ]
                proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                for frame in frames:
                    if frame.shape[:2] != (h, w):
                        frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_AREA)
                    proc.stdin.write(frame.tobytes())
                proc.stdin.close()
                proc.wait()
                if proc.returncode == 0 and video_path.exists() and video_path.stat().st_size > 500:
                    success = True
            except Exception as e:
                logger.warning(f"Direct FFmpeg pipe writing failed: {e}. Falling back to OpenCV.")
                success = False

        # Approach 2: OpenCV fallback if FFmpeg pipe unavailable or failed
        if not success:
            try:
                temp_path = cam_dir / f"temp_{time_str}.mp4"
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(str(temp_path), fourcc, fps, (w, h))
                if not writer.isOpened():
                    fourcc = cv2.VideoWriter_fourcc(*'avc1')
                    writer = cv2.VideoWriter(str(temp_path), fourcc, fps, (w, h))
                for frame in frames:
                    if frame.shape[:2] != (h, w):
                        frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_AREA)
                    writer.write(frame)
                writer.release()
                if temp_path.exists():
                    temp_path.rename(video_path)
                    success = True
            except Exception as e:
                logger.error(f"OpenCV fallback video writer failed: {e}")
                return None

        duration_sec = len(frames) / fps if fps > 0 else 0.0
        logger.info(f"🎥 Saved smooth event clip: {video_path} ({len(frames)} frames @ {fps:.2f}fps = {duration_sec:.1f}s)")
        return str(video_path)
