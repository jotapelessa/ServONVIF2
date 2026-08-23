import asyncio
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
import cv2
import numpy as np
from loguru import logger

from engine.database.models import Camera, MotionEvent
from engine.core.ring_buffer import CircularRingBuffer
from engine.core.motion_detector import MotionDetector
from engine.core.media_writer import MediaWriter
from engine.services.mjpeg_streamer import mjpeg_streamer
from engine.services.telegram_bot import telegram_service
from engine.api.websocket_hub import ws_hub
from engine.config.settings import settings

class StreamIngestor:
    """
    Dedicated worker for a single IP Camera stream:
    1. Ingests RTSP stream via OpenCV/FFmpeg.
    2. Maintains a circular RAM buffer of recent frames.
    3. Runs downscaled Motion Detection (MOG2).
    4. Broadcasts frames to MJPEG streamer.
    5. Saves MP4 clips & thumbnails on motion confirmation.
    6. Dispatches push notifications to WebSockets and Telegram.
    """
    def __init__(self, camera: Camera, db_save_event_cb: Callable):
        self.camera = camera
        self.db_save_event_cb = db_save_event_cb
        self.is_running = False
        self._thread: Optional[threading.Thread] = None

        self.ring_buffer = CircularRingBuffer(max_duration_seconds=settings.DEFAULT_BUFFER_SECONDS)
        self.motion_detector = MotionDetector(
            roi_polygon=camera.roi_polygon,
            sensitivity=camera.sensitivity
        )

        self._is_recording_event = False
        self._event_frames = []
        self._post_event_countdown = 0
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        if self.is_running:
            return
        self._loop = loop
        self.is_running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True, name=f"Ingestor-Cam{self.camera.id}")
        self._thread.start()
        logger.info(f"Stream ingestor started for camera [{self.camera.id}] {self.camera.name}")

    def stop(self) -> None:
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info(f"Stream ingestor stopped for camera [{self.camera.id}] {self.camera.name}")

    def update_config(self, camera: Camera) -> None:
        self.camera = camera
        self.motion_detector.update_roi_polygon(camera.roi_polygon)
        self.motion_detector.sensitivity = camera.sensitivity

    def _create_capture(self, rtsp_url: str) -> cv2.VideoCapture:
        import os
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;5000000"
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _capture_loop(self) -> None:
        rtsp_url = self.camera.rtsp_url
        cap = self._create_capture(rtsp_url)
        
        raw_fps = cap.get(cv2.CAP_PROP_FPS)
        if raw_fps <= 0 or np.isnan(raw_fps) or raw_fps > 60:
            fps = 20.0
        else:
            fps = float(raw_fps)

        logger.info(f"Camera [{self.camera.id}] {self.camera.name} calibrated at {fps:.1f} FPS (raw={raw_fps})")

        frame_interval = 1.0 / fps
        last_frame_time = time.time()

        while self.is_running:
            ret, frame = cap.read()
            if not ret or frame is None:
                logger.warning(f"Failed to read frame from camera [{self.camera.id}] {self.camera.name}. Reconnecting in 3s...")
                time.sleep(3.0)
                cap.release()
                cap = self._create_capture(rtsp_url)
                continue

            current_time = time.time()
            self.ring_buffer.push(frame, is_keyframe=True, timestamp=current_time)

            # Broadcast downscaled frame to MJPEG streamer
            mjpeg_streamer.broadcast_frame(self.camera.id, frame)

            # Downscale preserving native aspect ratio for motion detection
            orig_h, orig_w = frame.shape[:2]
            scale_ratio = 640.0 / max(orig_w, 1)
            target_w = 640
            target_h = int(orig_h * scale_ratio)
            small_frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

            is_motion, score, bboxes = self.motion_detector.process_frame(small_frame)

            # Scale bboxes back to original frame dimensions
            orig_bboxes = [
                (int(x / scale_ratio), int(y / scale_ratio), int(bw / scale_ratio), int(bh / scale_ratio))
                for (x, y, bw, bh) in bboxes
            ]

            if is_motion and not self._is_recording_event:
                self._handle_motion_start(frame, score, orig_bboxes)

            if self._is_recording_event:
                self._event_frames.append(frame)
                if not is_motion:
                    self._post_event_countdown -= 1
                    if self._post_event_countdown <= 0:
                        self._handle_motion_end(fps)

            # Control capture rate
            elapsed = time.time() - last_frame_time
            if elapsed < frame_interval:
                time.sleep(frame_interval - elapsed)
            last_frame_time = time.time()

        cap.release()

    def _handle_motion_start(self, current_frame: np.ndarray, score: float, bboxes: list) -> None:
        self._is_recording_event = True
        self._post_event_countdown = int(settings.POST_EVENT_SECONDS * 20) # ~5s at 20fps
        now = datetime.utcnow()

        # Retrieve pre-event frames from buffer
        pre_frames = self.ring_buffer.get_window(pre_seconds=settings.PRE_EVENT_SECONDS)
        self._event_frames = list(pre_frames) + [current_frame]

        # Save thumbnail with scaled bounding boxes
        thumb_path = MediaWriter.save_thumbnail(
            camera_id=self.camera.id,
            timestamp=now,
            frame_bgr=current_frame,
            bounding_boxes=bboxes
        )

        event_payload = {
            "type": "MOTION_ALERT",
            "camera_id": self.camera.id,
            "camera_name": self.camera.name,
            "timestamp": now.isoformat(),
            "score": round(score, 4),
            "thumbnail_url": f"/api/events/thumbnail/{self.camera.id}/{now.strftime('%Y-%m-%d')}/{Path(thumb_path).name}",
            "mjpeg_url": f"/api/mjpeg/{self.camera.id}"
        }

        # Dispatch async WebSocket alert & Telegram
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_hub.broadcast_event(event_payload), self._loop)
            asyncio.run_coroutine_threadsafe(
                telegram_service.send_photo_alert(
                    camera_id=self.camera.id,
                    camera_name=self.camera.name,
                    timestamp_str=now.strftime("%d/%m/%Y %H:%M:%S"),
                    photo_path=thumb_path,
                    score=score
                ),
                self._loop
            )

        self._current_event_data = {
            "camera_id": self.camera.id,
            "camera_name": self.camera.name,
            "timestamp": now,
            "score": score,
            "thumbnail_path": thumb_path
        }

    def _handle_motion_end(self, fps: float) -> None:
        self._is_recording_event = False
        frames_to_save = list(self._event_frames)
        self._event_frames = []
        now = self._current_event_data["timestamp"]

        video_path = MediaWriter.save_video_clip(
            camera_id=self.camera.id,
            timestamp=now,
            frames=frames_to_save,
            fps=fps
        )

        duration = len(frames_to_save) / fps if fps > 0 else 0.0

        if self._loop and self._loop.is_running():
            # Save event to SQLite database
            asyncio.run_coroutine_threadsafe(
                self.db_save_event_cb(
                    camera_id=self.camera.id,
                    camera_name=self.camera.name,
                    timestamp=now,
                    score=self._current_event_data["score"],
                    thumbnail_path=self._current_event_data["thumbnail_path"],
                    video_path=video_path,
                    duration_seconds=duration
                ),
                self._loop
            )

            # Send video clip to Telegram if available
            if video_path:
                asyncio.run_coroutine_threadsafe(
                    telegram_service.send_video_clip(
                        camera_id=self.camera.id,
                        camera_name=self.camera.name,
                        video_path=video_path
                    ),
                    self._loop
                )
