import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from loguru import logger

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

class CameraScanPayload(BaseModel):
    custom_ip: Optional[str] = None
    custom_subnet: Optional[str] = None

@router.post("/scan", response_model=List[dict])
async def scan_network_cameras(payload: Optional[CameraScanPayload] = None):
    custom_ip = payload.custom_ip if payload else None
    custom_subnet = payload.custom_subnet if payload else None
    cameras = await ONVIFDiscovery.discover_cameras(
        timeout_seconds=7.0,
        custom_ip=custom_ip,
        custom_subnet=custom_subnet
    )
    return cameras

@router.post("/", response_model=Camera)
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)):
    camera = Camera(**payload.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)

    logger.success(f"[Gerenciador de Câmeras] ➕ Nova câmera cadastrada: #{camera.id} '{camera.name}' ({camera.rtsp_url})")

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

    logger.info(f"[Gerenciador de Câmeras] ✏️ Câmera #{camera.id} '{camera.name}' atualizada")

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

    logger.warning(f"[Gerenciador de Câmeras] 🗑️ Câmera #{camera_id} '{cam_name}' removida do sistema")
    asyncio.create_task(dispatch_telegram_backup(reason=f"Câmera Removida: {cam_name}"))
    return {"message": "Camera deleted successfully"}

@router.post("/{camera_id}/roi", response_model=Camera)
async def update_camera_roi(camera_id: int, payload: ROISetPayload, db: AsyncSession = Depends(get_db)):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.roi_polygon = payload.roi_polygon
    camera.ignore_polygons = payload.ignore_polygons

    await db.commit()
    await db.refresh(camera)

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


# ================= ONVIF HARDWARE MANAGEMENT ENDPOINTS =================

class OnvifImagingPayload(BaseModel):
    brightness: Optional[float] = None
    contrast: Optional[float] = None
    color_saturation: Optional[float] = None
    sharpness: Optional[float] = None
    ir_cut_filter: Optional[str] = None
    wdr: Optional[str] = None


@router.get("/{camera_id}/onvif/imaging")
async def get_camera_onvif_imaging(camera_id: int, db: AsyncSession = Depends(get_db)):
    """
    Queries current ONVIF brightness, contrast, saturation, sharpness and IR night vision settings.
    """
    from engine.services.onvif_service import onvif_service
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    ip = camera.ip_address or "127.0.0.1"
    port = camera.onvif_port or 80
    return await onvif_service.get_imaging_settings(
        ip=ip,
        port=port,
        username=camera.username,
        password=camera.password
    )


@router.post("/{camera_id}/onvif/imaging")
async def set_camera_onvif_imaging(
    camera_id: int,
    payload: OnvifImagingPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Applies image and night vision adjustments directly to camera hardware via ONVIF.
    """
    from engine.services.onvif_service import onvif_service
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    ip = camera.ip_address or "127.0.0.1"
    port = camera.onvif_port or 80
    res = await onvif_service.set_imaging_settings(
        ip=ip,
        port=port,
        username=camera.username,
        password=camera.password,
        brightness=payload.brightness,
        contrast=payload.contrast,
        color_saturation=payload.color_saturation,
        sharpness=payload.sharpness,
        ir_cut_filter=payload.ir_cut_filter,
        wdr=payload.wdr
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message", "Falha ao aplicar ajustes ONVIF"))
    return res


@router.post("/{camera_id}/onvif/reboot")
async def reboot_camera_hardware(camera_id: int, db: AsyncSession = Depends(get_db)):
    """
    Gracefully restarts the camera hardware via ONVIF SystemReboot.
    """
    from engine.services.onvif_service import onvif_service
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    ip = camera.ip_address or "127.0.0.1"
    port = camera.onvif_port or 80
    res = await onvif_service.reboot_camera(
        ip=ip,
        port=port,
        username=camera.username,
        password=camera.password
    )
    return res


@router.post("/{camera_id}/onvif/sync-time")
async def sync_camera_time(camera_id: int, db: AsyncSession = Depends(get_db)):
    """
    Synchronizes camera date and clock with host server time via ONVIF.
    """
    from engine.services.onvif_service import onvif_service
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    ip = camera.ip_address or "127.0.0.1"
    port = camera.onvif_port or 80
    res = await onvif_service.sync_camera_time(
        ip=ip,
        port=port,
        username=camera.username,
        password=camera.password
    )
    return res


@router.get("/{camera_id}/sensor-diagnostics")
async def get_camera_sensor_diagnostics(camera_id: int, db: AsyncSession = Depends(get_db)):
    """
    Performs full optical & sensor audit: tests native resolution (5MP/3MP/1080p),
    sharpness score (Laplacian variance), discovers ONVIF Main/Sub profiles,
    and detects if the camera is bottlenecked by sub-stream.
    """
    from engine.services.onvif_service import onvif_service
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    latest_frame = None
    ingestor = camera_manager.ingestors.get(camera_id)
    if ingestor and ingestor._latest_frame is not None:
        with ingestor._frame_lock:
            if ingestor._latest_frame is not None:
                latest_frame = ingestor._latest_frame.copy()

    ip = camera.ip_address or "127.0.0.1"
    port = camera.onvif_port or 80

    return await onvif_service.audit_sensor_quality(
        ip=ip,
        port=port,
        username=camera.username,
        password=camera.password,
        current_rtsp_url=camera.rtsp_url,
        latest_frame=latest_frame
    )


class SwitchProfilePayload(BaseModel):
    profile_uri: str

@router.post("/{camera_id}/switch-profile")
async def switch_camera_stream_profile(
    camera_id: int,
    payload: SwitchProfilePayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Instantly switches the camera's RTSP stream to a higher-resolution Main profile (e.g. 5MP/3MP),
    reinitializes the real-time ingestor, and saves config.
    """
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.rtsp_url = payload.profile_uri
    await db.commit()
    await db.refresh(camera)

    # Reinitialize stream ingestor with new resolution
    camera_manager.update_camera_config(camera)
    asyncio.create_task(dispatch_telegram_backup(reason=f"Perfil de Resolução Alterado: {camera.name} -> {payload.profile_uri}"))

    return {
        "success": True,
        "message": f"Stream atualizado com sucesso para {payload.profile_uri}! Ingestão reiniciada em alta resolução.",
        "camera": camera
    }


