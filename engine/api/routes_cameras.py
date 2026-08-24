import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from engine.database.db import get_db
from engine.database.models import Camera
from engine.core.camera_manager import camera_manager
from engine.core.discovery import ONVIFDiscovery
from engine.core.media_writer import MediaWriter
from engine.services.backup_service import dispatch_telegram_backup
from engine.services.telegram_bot import telegram_service

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

class CameraCreate(BaseModel):
    name: str
    rtsp_url: str
    ip_address: Optional[str] = None
    onvif_port: Optional[int] = 80
    username: Optional[str] = None
    password: Optional[str] = None
    sensitivity: Optional[float] = 20.0
    roi_polygon: Optional[List[List[float]]] = None
    ignore_polygons: Optional[List[List[List[float]]]] = None
    allowed_device_ids: Optional[List[str]] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    is_active: Optional[bool] = None
    sensitivity: Optional[float] = None
    roi_polygon: Optional[List[List[float]]] = None
    ignore_polygons: Optional[List[List[List[float]]]] = None
    allowed_device_ids: Optional[List[str]] = None

class ROISetPayload(BaseModel):
    roi_polygon: Optional[List[List[float]]] = None
    ignore_polygons: Optional[List[List[List[float]]]] = None

@router.get("/", response_model=List[Camera])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    return result.scalars().all()

@router.post("/scan", response_model=List[dict])
async def scan_network_cameras():
    cameras = await ONVIFDiscovery.discover_cameras(timeout_seconds=7.0)
    return cameras

@router.post("/", response_model=Camera)
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)):
    camera = Camera(**payload.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)

    if camera.is_active:
        await camera_manager.start_camera(camera)

    asyncio.create_task(dispatch_telegram_backup(reason=f"Nova Câmera Adicionada: {camera.name}"))
    return camera

@router.get("/{camera_id}", response_model=Camera)
async def get_camera(camera_id: int, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.put("/{camera_id}", response_model=Camera)
async def update_camera(camera_id: int, payload: CameraUpdate, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(camera, key, value)

    await db.commit()
    await db.refresh(camera)

    if camera.is_active:
        if camera.id in camera_manager.ingestors:
            camera_manager.update_camera_config(camera)
        else:
            await camera_manager.start_camera(camera)
    else:
        camera_manager.stop_camera(camera.id)

    asyncio.create_task(dispatch_telegram_backup(reason=f"Câmera Atualizada: {camera.name} (Sensibilidade/Ajustes)"))
    return camera

@router.delete("/{camera_id}")
async def delete_camera(camera_id: int, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    cam_name = camera.name
    camera_manager.stop_camera(camera_id)
    await db.delete(camera)
    await db.commit()

    asyncio.create_task(dispatch_telegram_backup(reason=f"Câmera Removida: {cam_name}"))
    return {"message": "Camera deleted successfully"}

@router.post("/{camera_id}/roi", response_model=Camera)
async def update_camera_roi(camera_id: int, payload: ROISetPayload, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if payload.roi_polygon is not None:
        camera.roi_polygon = payload.roi_polygon
    camera_manager.update_camera_config(camera)
    asyncio.create_task(dispatch_telegram_backup(reason=f"Zonas de Detecção (Ciano/Roxa) Atualizadas: {camera.name}"))
    return camera

@router.post("/{camera_id}/snapshot")
async def capture_camera_snapshot(
    camera_id: int,
    send_telegram: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Captures an instant high-resolution frame snapshot from the active RTSP ingestor.
    Saves to media directory and optionally dispatches to Telegram Cloud Vault.
    """
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    ingestor = camera_manager.ingestors.get(camera_id)
    if not ingestor:
        raise HTTPException(status_code=400, detail="Camera stream is not active")

    with ingestor._frame_lock:
        if ingestor._latest_frame is None:
            raise HTTPException(status_code=503, detail="No frame available from camera stream")
        frame = ingestor._latest_frame.copy()

    now = datetime.utcnow()
    thumb_path = MediaWriter.save_thumbnail(
        camera_id=camera_id,
        timestamp=now,
        frame_bgr=frame
    )

    time_str = now.strftime("%H-%M-%S")
    date_str = now.strftime("%Y-%m-%d")
    thumb_url = f"/api/events/thumbnail/{camera_id}/{date_str}/{time_str}_thumb.jpg"

    if send_telegram and telegram_service.is_configured:
        asyncio.create_task(
            telegram_service.send_photo_alert(
                camera_id=camera_id,
                camera_name=camera.name,
                timestamp_str=now.strftime("%d/%m/%Y %H:%M:%S"),
                photo_path=thumb_path,
                score=1.0,
                event_dt=now
            )
        )

    return {
        "success": True,
        "camera_id": camera_id,
        "camera_name": camera.name,
        "timestamp": now.isoformat(),
        "thumbnail_url": thumb_url,
        "thumbnail_path": thumb_path,
        "message": f"Snapshot em alta resolução capturado com sucesso para {camera.name}!"
    }
