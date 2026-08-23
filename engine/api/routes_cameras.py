from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from engine.database.db import get_db
from engine.database.models import Camera
from engine.core.camera_manager import camera_manager
from engine.core.discovery import ONVIFDiscovery

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

class CameraCreate(BaseModel):
    name: str
    rtsp_url: str
    ip_address: Optional[str] = None
    onvif_port: Optional[int] = 80
    username: Optional[str] = None
    password: Optional[str] = None
    sensitivity: Optional[float] = 0.03
    roi_polygon: Optional[List[List[float]]] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    is_active: Optional[bool] = None
    sensitivity: Optional[float] = None
    roi_polygon: Optional[List[List[float]]] = None

class ROISetPayload(BaseModel):
    roi_polygon: List[List[float]]

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

    return camera

@router.delete("/{camera_id}")
async def delete_camera(camera_id: int, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_manager.stop_camera(camera_id)
    await db.delete(camera)
    await db.commit()
    return {"message": "Camera deleted successfully"}

@router.post("/{camera_id}/roi", response_model=Camera)
async def update_camera_roi(camera_id: int, payload: ROISetPayload, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.roi_polygon = payload.roi_polygon
    await db.commit()
    await db.refresh(camera)

    camera_manager.update_camera_config(camera)
    return camera
