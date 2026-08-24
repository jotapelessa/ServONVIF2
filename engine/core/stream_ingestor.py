import asyncio
import threading
import time
import os
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
    Dedicated Zero-Latency worker for IP Camera streams:
    - Decoupled Ultra-Low-Latency Frame Grabber (always consumes latest RTSP frame, eliminating buffering lag).
    - Asynchronous Motion Detection & Instant WebSocket Alert Dispatch (sub-100ms response time).
    - Asynchronous disk writes & Telegram notifications in background workers.
    """
    def __init__(self, camera: Camera, db_save_event_cb: Callable):
        self.camera = camera
        self.db_save_event_cb = db_save_event_cb
        self.is_running = False
        
        self._grabber_thread: Optional[threading.Thread] = None
        self._processor_thread: Optional[threading.Thread] = None

        self.ring_buffer = CircularRingBuffer(max_duration_seconds=settings.DEFAULT_BUFFER_SECONDS)
        self.motion_detector = MotionDetector(
            roi_polygon=camera.roi_polygon,
            ignore_polygons=getattr(camera, "ignore_polygons", None),
            sensitivity=camera.sensitivity
        )

        # Thread-safe frame sharing for zero-lag
        self._latest_frame: Optional[np.ndarray] = None
        self._latest_frame_time: float = 0.0
        self._frame_lock = threading.Lock()
        self._new_frame_event = threading.Event()

        self._is_recording_event = False
        self._event_frames = []
        self._post_event_countdown = 0
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._last_alert_time = 0.0

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        if self.is_running:
            return
        self._loop = loop
        self.is_running = True
        
        # 1. Grabber Thread: High-priority non-blocking RTSP stream reader
        self._grabber_thread = threading.Thread(
            target=self._grabber_loop, 
            daemon=True, 
            name=f"Grabber-Cam{self.camera.id}"
        )
        self._grabber_thread.start()

        # 2. Processor Thread: Real-time MOG2 motion detection & alert dispatcher
        self._processor_thread = threading.Thread(
            target=self._processor_loop,
            daemon=True,
            name=f"Processor-Cam{self.camera.id}"
        )
        self._processor_thread.start()

        logger.info(f"Zero-Latency Ingestor started for camera [{self.camera.id}] {self.camera.name}")

    def stop(self) -> None:
        self.is_running = False
        self._new_frame_event.set()
        if self._grabber_thread and self._grabber_thread.is_alive():
            self._grabber_thread.join(timeout=1.5)
        if self._processor_thread and self._processor_thread.is_alive():
            self._processor_thread.join(timeout=1.5)
        logger.info(f"Stream ingestor stopped for camera [{self.camera.id}] {self.camera.name}")

    def update_config(self, camera: Camera) -> None:
        self.camera = camera
        self.motion_detector.update_zones(
            roi_polygon=camera.roi_polygon,
            ignore_polygons=getattr(camera, "ignore_polygons", None),
            sensitivity=camera.sensitivity
        )

    def _create_capture(self, rtsp_url: str) -> cv2.VideoCapture:
        # Ultra-low-latency FFmpeg parameters
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            "rtsp_transport;tcp|"
            "fflags;nobuffer|"
            "flags;low_delay|"
            "max_delay;250000|"
            "stimeout;4000000"
        )
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _grabber_loop(self) -> None:
        """
        Continuously drains the RTSP buffer as fast as packets arrive.
        Ensures the camera frame is NEVER buffered or delayed.
        """
        rtsp_url = self.camera.rtsp_url
        cap = self._create_capture(rtsp_url)

        while self.is_running:
            ret, frame = cap.read()
            if not ret or frame is None:
                logger.warning(f"RTSP stream dropped for [{self.camera.id}] {self.camera.name}. Reconnecting...")
                time.sleep(2.0)
                cap.release()
                cap = self._create_capture(rtsp_url)
                continue

            now = time.time()
            with self._frame_lock:
                self._latest_frame = frame
                self._latest_frame_time = now

            self._new_frame_event.set()

        cap.release()

    def _processor_loop(self) -> None:
        """
        Processes frames at up to 15-20 FPS for instant real-time AI & Motion Detection.
        """
        fps = 20.0
        frame_interval = 1.0 / fps

        while self.is_running:
            # Wait for fresh frame from grabber
            if not self._new_frame_event.wait(timeout=0.2):
                continue
            self._new_frame_event.clear()

            with self._frame_lock:
                if self._latest_frame is None:
                    continue
                frame = self._latest_frame.copy()
                frame_time = self._latest_frame_time

            # 1. Update circular RAM ring buffer & MJPEG broadcast
            self.ring_buffer.push(frame, is_keyframe=True, timestamp=frame_time)
            mjpeg_streamer.broadcast_frame(self.camera.id, frame)

            # 2. Downscale for fast MOG2 motion detection
            orig_h, orig_w = frame.shape[:2]
            scale_ratio = 480.0 / max(orig_w, 1)
            target_w = 480
            target_h = int(orig_h * scale_ratio)
            small_frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

            is_motion, score, bboxes = self.motion_detector.process_frame(small_frame)

            orig_bboxes = [
                (int(x / scale_ratio), int(y / scale_ratio), int(bw / scale_ratio), int(bh / scale_ratio))
                for (x, y, bw, bh) in bboxes
            ]

            now_monotonic = time.time()
            if is_motion and not self._is_recording_event:
                # Minimum 3s cooldown between distinct event alerts
                if now_monotonic - self._last_alert_time > 3.0:
                    self._last_alert_time = now_monotonic
                    self._handle_motion_start_instant(frame, score, orig_bboxes)

            if self._is_recording_event:
                self._event_frames.append(frame)
                if not is_motion:
                    self._post_event_countdown -= 1
                    if self._post_event_countdown <= 0:
                        self._handle_motion_end_async(fps)

            # Keep steady processing cadence without blocking grabber
            time.sleep(0.04)

    def _handle_motion_start_instant(self, current_frame: np.ndarray, score: float, bboxes: list) -> None:
        """
        INSTANT ALERT: Dispatches WebSocket to TV/Tablets in milliseconds (<50ms).
        Disk I/O and Telegram are pushed to background threads so WebSocket is NEVER blocked!
        """
        self._is_recording_event = True
        self._post_event_countdown = int(settings.POST_EVENT_SECONDS * 15)
        now = datetime.utcnow()

        # Retrieve pre-event window
        pre_frames = self.ring_buffer.get_window(pre_seconds=settings.PRE_EVENT_SECONDS)
        self._event_frames = list(pre_frames) + [current_frame]

        # 1. INSTANT NOTIFICATION TO WEBSOCKET CLIENTS
        time_str = now.strftime("%H-%M-%S")
        date_str = now.strftime("%Y-%m-%d")
        thumb_filename = f"{time_str}_thumb.jpg"
        thumb_url = f"/api/events/thumbnail/{self.camera.id}/{date_str}/{thumb_filename}"

        event_payload = {
            "type": "MOTION_ALERT",
            "camera_id": self.camera.id,
            "camera_name": self.camera.name,
            "timestamp": now.isoformat(),
            "score": round(score, 4),
            "thumbnail_url": thumb_url,
            "mjpeg_url": f"/api/mjpeg/{self.camera.id}"
        }

        if self._loop and self._loop.is_running():
            allowed_devs = getattr(self.camera, "allowed_device_ids", None)
            asyncio.run_coroutine_threadsafe(
                ws_hub.broadcast_event(event_payload, allowed_device_ids=allowed_devs),
                self._loop
            )
            logger.info(f"⚡ INSTANT WebSocket Alert Broadcasted for [{self.camera.id}] {self.camera.name} (Score: {score:.2f})")

        # 2. ASYNC BACKGROUND WORKER FOR THUMBNAIL & TELEGRAM (Non-blocking)
        self._current_thumb_path = ""

        def _save_and_notify_bg():
            try:
                thumb_path = MediaWriter.save_thumbnail(
                    camera_id=self.camera.id,
                    timestamp=now,
                    frame_bgr=current_frame,
                    bounding_boxes=bboxes
                )
                self._current_thumb_path = thumb_path
                if self._loop and self._loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        telegram_service.send_photo_alert(
                            camera_id=self.camera.id,
                            camera_name=self.camera.name,
                            timestamp_str=now.strftime("%d/%m/%Y %H:%M:%S"),
                            photo_path=thumb_path,
                            score=score,
                            event_dt=now
                        ),
                        self._loop
                    )
            except Exception as e:
                logger.error(f"Background alert task error: {e}")

        threading.Thread(target=_save_and_notify_bg, daemon=True).start()

        self._current_event_data = {
            "camera_id": self.camera.id,
            "camera_name": self.camera.name,
            "timestamp": now,
            "score": score
        }

    def _handle_motion_end_async(self, fps: float) -> None:
        self._is_recording_event = False
        frames_to_save = list(self._event_frames)
        self._event_frames = []
        now = self._current_event_data["timestamp"]
        score = self._current_event_data["score"]
        saved_thumb_path = getattr(self, "_current_thumb_path", "")

        def _save_video_and_db_bg():
            try:
                video_path = MediaWriter.save_video_clip(
                    camera_id=self.camera.id,
                    timestamp=now,
                    frames=frames_to_save,
                    fps=fps
                )
                duration = len(frames_to_save) / fps if fps > 0 else 0.0

                if self._loop and self._loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        self.db_save_event_cb(
                            camera_id=self.camera.id,
                            camera_name=self.camera.name,
                            timestamp=now,
                            score=score,
                            thumbnail_path=saved_thumb_path,
                            video_path=video_path,
                            duration_seconds=duration
                        ),
                        self._loop
                    )
                    if video_path:
                        asyncio.run_coroutine_threadsafe(
                            telegram_service.send_video_clip(
                                camera_id=self.camera.id,
                                camera_name=self.camera.name,
                                video_path=video_path,
                                score=score,
                                duration_seconds=duration,
                                event_dt=now
                            ),
                            self._loop
                        )
            except Exception as e:
                logger.error(f"Background video save error: {e}")

        threading.Thread(target=_save_video_and_db_bg, daemon=True).start()
