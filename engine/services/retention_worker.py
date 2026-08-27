import asyncio
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.future import select
from loguru import logger

from engine.config.settings import settings
from engine.database.db import async_session_factory
from engine.database.models import MotionEvent

class RetentionWorker:
    """
    Periodic background cleaner that deletes video clips, thumbnails,
    and database records older than RETENTION_DAYS to avoid filling the disk.
    """
    def __init__(self, interval_hours: int = 6):
        self.interval_seconds = interval_hours * 3600
        self.is_running = False
        self._task: asyncio.Task | None = None

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info(f"RetentionWorker started (cleaning files older than {settings.RETENTION_DAYS} days)")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()

    async def _run_loop(self):
        while self.is_running:
            try:
                await self.cleanup_old_media()
            except Exception as e:
                logger.error(f"Error during retention cleanup: {e}")

            # Sleep until next cleanup cycle
            await asyncio.sleep(self.interval_seconds)

    async def cleanup_old_media(self, days: int | None = None, camera_id: int | None = None) -> int:
        retention_limit = days if days is not None else settings.RETENTION_DAYS
        cutoff_date = datetime.utcnow() - timedelta(days=retention_limit)
        logger.info(f"Running media retention cleanup for records older than {cutoff_date.date()} (Days: {retention_limit}, Camera: {camera_id or 'ALL'})...")
        deleted_count = 0

        # 1. Clean DB records
        async with async_session_factory() as session:
            query = select(MotionEvent).where(MotionEvent.timestamp < cutoff_date)
            if camera_id is not None:
                query = query.where(MotionEvent.camera_id == camera_id)

            result = await session.execute(query)
            old_events = result.scalars().all()

            for evt in old_events:
                # Remove files from filesystem if they exist
                if evt.thumbnail_path and Path(evt.thumbnail_path).exists():
                    try:
                        Path(evt.thumbnail_path).unlink()
                    except Exception as e:
                        logger.warning(f"Failed to delete {evt.thumbnail_path}: {e}")

                if evt.video_path and Path(evt.video_path).exists():
                    try:
                        Path(evt.video_path).unlink()
                    except Exception as e:
                        logger.warning(f"Failed to delete {evt.video_path}: {e}")

                await session.delete(evt)
                deleted_count += 1

            await session.commit()
            if old_events:
                logger.info(f"Purged {len(old_events)} expired event records from database.")

        # 2. Clean empty or expired dated folders in MEDIA_DIR
        if settings.MEDIA_DIR.exists():
            for cam_dir in settings.MEDIA_DIR.iterdir():
                if cam_dir.is_dir():
                    if camera_id is not None and cam_dir.name != str(camera_id):
                        continue
                    for date_dir in cam_dir.iterdir():
                        if date_dir.is_dir():
                            try:
                                dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                                if dir_date < cutoff_date:
                                    shutil.rmtree(date_dir)
                                    logger.info(f"Deleted expired media directory: {date_dir}")
                            except ValueError:
                                pass

        return deleted_count

    async def cleanup_by_camera(self, camera_id: int) -> int:
        """Deletes all recordings and database events for a single camera."""
        deleted_count = 0
        async with async_session_factory() as session:
            result = await session.execute(
                select(MotionEvent).where(MotionEvent.camera_id == camera_id)
            )
            events = result.scalars().all()
            for evt in events:
                if evt.thumbnail_path and Path(evt.thumbnail_path).exists():
                    try:
                        Path(evt.thumbnail_path).unlink()
                    except Exception:
                        pass
                if evt.video_path and Path(evt.video_path).exists():
                    try:
                        Path(evt.video_path).unlink()
                    except Exception:
                        pass
                await session.delete(evt)
                deleted_count += 1
            await session.commit()

        cam_dir = settings.MEDIA_DIR / str(camera_id)
        if cam_dir.exists() and cam_dir.is_dir():
            shutil.rmtree(cam_dir, ignore_errors=True)

        logger.info(f"Wiped all {deleted_count} events and media folder for Camera #{camera_id}")
        return deleted_count

    async def wipe_all_media(self) -> int:
        """Wipes all event recordings and database events across all cameras."""
        deleted_count = 0
        async with async_session_factory() as session:
            result = await session.execute(select(MotionEvent))
            events = result.scalars().all()
            for evt in events:
                await session.delete(evt)
                deleted_count += 1
            await session.commit()

        if settings.MEDIA_DIR.exists():
            for item in settings.MEDIA_DIR.iterdir():
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                elif item.is_file():
                    try:
                        item.unlink()
                    except Exception:
                        pass

        logger.warning(f"🚨 Wiped ALL {deleted_count} media records and files from storage!")
        return deleted_count

retention_worker = RetentionWorker()
