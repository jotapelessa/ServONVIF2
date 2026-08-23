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

    async def cleanup_old_media(self):
        cutoff_date = datetime.utcnow() - timedelta(days=settings.RETENTION_DAYS)
        logger.info(f"Running media retention cleanup for records older than {cutoff_date.date()}...")

        # 1. Clean DB records
        async with async_session_factory() as session:
            result = await session.execute(
                select(MotionEvent).where(MotionEvent.timestamp < cutoff_date)
            )
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

            await session.commit()
            if old_events:
                logger.info(f"Purged {len(old_events)} expired event records from database.")

        # 2. Clean empty dated folders in MEDIA_DIR
        for cam_dir in settings.MEDIA_DIR.iterdir():
            if cam_dir.is_dir():
                for date_dir in cam_dir.iterdir():
                    if date_dir.is_dir():
                        try:
                            dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                            if dir_date < cutoff_date:
                                shutil.rmtree(date_dir)
                                logger.info(f"Deleted expired media directory: {date_dir}")
                        except ValueError:
                            pass

retention_worker = RetentionWorker()
