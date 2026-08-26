from typing import List, Optional, Literal
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from engine.database.db import get_db
from engine.database.models import MotionEvent
from engine.config.settings import settings

router = APIRouter(prefix="/api/events", tags=["Events"])

class BatchDeletePayload(BaseModel):
    mode: Literal["day", "older_than_7_days", "older_than_30_days", "all"]
    date_str: Optional[str] = None # Format: YYYY-MM-DD
    camera_id: Optional[int] = None

def _format_size(size_bytes: int) -> str:
    if size_bytes <= 0:
        return "0 KB"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"

def _populate_event_file_size(event: MotionEvent) -> MotionEvent:
    size = 0
    if event.video_path:
        p = Path(event.video_path)
        if not p.is_absolute():
            p = settings.MEDIA_DIR / p
        if p.exists():
            try:
                size = p.stat().st_size
            except Exception:
                pass

    if size == 0 and event.thumbnail_path:
        p = Path(event.thumbnail_path)
        if not p.is_absolute():
            p = settings.MEDIA_DIR / p
        if p.exists():
            try:
                size = p.stat().st_size
            except Exception:
                pass

    if size > 0:
        event.file_size_bytes = size
        event.file_size_formatted = _format_size(size)
    else:
        event.file_size_bytes = 0
        event.file_size_formatted = "--"
    return event

@router.get("/", response_model=List[MotionEvent])
async def list_events(
    camera_id: Optional[int] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(MotionEvent).order_by(MotionEvent.timestamp.desc()).offset(offset).limit(limit)
    if camera_id is not None:
        query = query.where(MotionEvent.camera_id == camera_id)

    result = await db.execute(query)
    events = result.scalars().all()
    for evt in events:
        _populate_event_file_size(evt)
    return events

@router.get("/thumbnail/{camera_id}/{date_str}/{filename}")
async def get_event_thumbnail(camera_id: int, date_str: str, filename: str):
    file_path = settings.MEDIA_DIR / f"camera_{camera_id}" / date_str / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/video/{camera_id}/{date_str}/{filename}")
async def get_event_video(camera_id: int, date_str: str, filename: str):
    file_path = settings.MEDIA_DIR / f"camera_{camera_id}" / date_str / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video clip not found")
    return FileResponse(file_path, media_type="video/mp4")

@router.get("/{event_id}/thumbnail")
async def get_event_thumbnail_by_id(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(MotionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.thumbnail_path and Path(event.thumbnail_path).exists():
        return FileResponse(Path(event.thumbnail_path), media_type="image/jpeg")
    
    # Try finding in camera directory for the event date
    date_str = event.timestamp.strftime("%Y-%m-%d")
    cam_dir = settings.MEDIA_DIR / f"camera_{event.camera_id}" / date_str
    if cam_dir.exists():
        thumbs = sorted(list(cam_dir.glob("*_thumb.jpg")), reverse=True)
        if thumbs:
            return FileResponse(thumbs[0], media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Thumbnail file not found")

@router.get("/{event_id}/video")
async def get_event_video_by_id(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(MotionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.video_path and Path(event.video_path).exists():
        return FileResponse(Path(event.video_path), media_type="video/mp4")
    
    raise HTTPException(status_code=404, detail="Video file not found")

@router.delete("/{event_id}")
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(MotionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Remove files if exist
    if event.thumbnail_path and Path(event.thumbnail_path).exists():
        try:
            Path(event.thumbnail_path).unlink()
        except Exception:
            pass

    if event.video_path and Path(event.video_path).exists():
        try:
            Path(event.video_path).unlink()
        except Exception:
            pass

    await db.delete(event)
    await db.commit()
    return {"message": "Evento e arquivos de mídia excluídos com sucesso"}

@router.post("/batch-delete")
async def batch_delete_events(payload: BatchDeletePayload, db: AsyncSession = Depends(get_db)):
    query = select(MotionEvent)

    if payload.camera_id is not None:
        query = query.where(MotionEvent.camera_id == payload.camera_id)

    now = datetime.utcnow()

    if payload.mode == "day":
        if not payload.date_str:
            payload.date_str = now.strftime("%Y-%m-%d")
        try:
            start_date = datetime.strptime(payload.date_str, "%Y-%m-%d")
            end_date = start_date + timedelta(days=1)
            query = query.where(MotionEvent.timestamp >= start_date, MotionEvent.timestamp < end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")

    elif payload.mode == "older_than_7_days":
        cutoff = now - timedelta(days=7)
        query = query.where(MotionEvent.timestamp < cutoff)

    elif payload.mode == "older_than_30_days":
        cutoff = now - timedelta(days=30)
        query = query.where(MotionEvent.timestamp < cutoff)

    elif payload.mode == "all":
        # Delete all matching
        pass

    result = await db.execute(query)
    events_to_delete = result.scalars().all()

    deleted_count = 0
    for evt in events_to_delete:
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

        await db.delete(evt)
        deleted_count += 1

    await db.commit()
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"{deleted_count} gravações foram excluídas permanentemente do disco e do banco."
    }
