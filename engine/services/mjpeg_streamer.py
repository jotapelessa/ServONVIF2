import asyncio
from typing import Dict, Set, AsyncGenerator
import cv2
import numpy as np
from loguru import logger

class MJPEGStreamer:
    """
    Broadcaster for distributing live MJPEG frames to multiple HTTP clients simultaneously.
    Encodes JPEG on-the-fly and applies backpressure by dropping frames for slow clients.
    """
    def __init__(self):
        self._queues: Dict[int, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def register_client(self, camera_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=2)
        async with self._lock:
            if camera_id not in self._queues:
                self._queues[camera_id] = set()
            self._queues[camera_id].add(queue)
        logger.debug(f"New MJPEG client connected to camera {camera_id}")
        return queue

    async def unregister_client(self, camera_id: int, queue: asyncio.Queue) -> None:
        async with self._lock:
            if camera_id in self._queues and queue in self._queues[camera_id]:
                self._queues[camera_id].remove(queue)
                if not self._queues[camera_id]:
                    del self._queues[camera_id]
        logger.debug(f"MJPEG client disconnected from camera {camera_id}")

    def broadcast_frame(self, camera_id: int, frame_bgr: np.ndarray, quality: int = 70) -> None:
        if camera_id not in self._queues or not self._queues[camera_id]:
            return

        # Encode JPEG
        _, jpeg = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
        frame_bytes = jpeg.tobytes()

        # Send to all connected queues non-blockingly
        for queue in list(self._queues.get(camera_id, set())):
            if queue.full():
                try:
                    queue.get_nowait()  # Drop oldest frame to ensure low latency
                except asyncio.QueueEmpty:
                    pass
            try:
                queue.put_nowait(frame_bytes)
            except asyncio.QueueFull:
                pass

    async def generate_mjpeg_stream(self, camera_id: int) -> AsyncGenerator[bytes, None]:
        queue = await self.register_client(camera_id)
        try:
            while True:
                frame_bytes = await queue.get()
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
                )
        except asyncio.CancelledError:
            pass
        finally:
            await self.unregister_client(camera_id, queue)

mjpeg_streamer = MJPEGStreamer()
