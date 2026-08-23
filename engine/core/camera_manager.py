import asyncio
from datetime import datetime
from typing import Dict, Optional, List
from sqlalchemy.future import select
from loguru import logger

from engine.database.db import async_session_factory
from engine.database.models import Camera, MotionEvent
from engine.core.stream_ingestor import StreamIngestor

class CameraManager:
    """
    Manages the lifecycle of all configured cameras:
    - Starts/stops active camera stream ingestors
    - Updates configurations dynamically without restart
    - Persists motion events to SQLite
    """
    def __init__(self):
        self.ingestors: Dict[int, StreamIngestor] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    async def initialize(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        await self.load_and_start_all_active_cameras()

    async def load_and_start_all_active_cameras(self) -> None:
        async with async_session_factory() as session:
            result = await session.execute(select(Camera).where(Camera.is_active == True))
            cameras = result.scalars().all()

        for cam in cameras:
            await self.start_camera(cam)

    async def start_camera(self, camera: Camera) -> None:
        if camera.id in self.ingestors:
            self.stop_camera(camera.id)

        ingestor = StreamIngestor(camera=camera, db_save_event_cb=self._save_event_to_db)
        loop = self._loop
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
                self._loop = loop
            except RuntimeError:
                pass
        
        if loop:
            ingestor.start(loop)
            self.ingestors[camera.id] = ingestor
            logger.info(f"Registered ingestor for camera [{camera.id}] in active ingestors map")
        else:
            logger.error(f"Cannot start camera [{camera.id}]: No asyncio event loop available")

    def stop_camera(self, camera_id: int) -> None:
        if camera_id in self.ingestors:
            self.ingestors[camera_id].stop()
            del self.ingestors[camera_id]

    def stop_all(self) -> None:
        for camera_id in list(self.ingestors.keys()):
            self.stop_camera(camera_id)

    def update_camera_config(self, camera: Camera) -> None:
        if camera.id in self.ingestors:
            self.ingestors[camera.id].update_config(camera)

    async def _save_event_to_db(
        self,
        camera_id: int,
        camera_name: str,
        timestamp: datetime,
        score: float,
        thumbnail_path: Optional[str],
        video_path: Optional[str],
        duration_seconds: float
    ) -> None:
        try:
            async with async_session_factory() as session:
                event = MotionEvent(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    timestamp=timestamp,
                    score=score,
                    thumbnail_path=thumbnail_path,
                    video_path=video_path,
                    telegram_sent=True,
                    duration_seconds=duration_seconds
                )
                session.add(event)
                await session.commit()
                logger.info(f"Persisted MotionEvent #{event.id} for camera [{camera_id}] {camera_name}")
        except Exception as e:
            logger.error(f"Failed to persist MotionEvent to DB: {e}")

camera_manager = CameraManager()
