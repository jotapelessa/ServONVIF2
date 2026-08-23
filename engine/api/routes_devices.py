from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from engine.database.db import get_db
from engine.database.models import Device
from engine.api.websocket_hub import ws_hub

router = APIRouter(prefix="/api/devices", tags=["Devices"])

class DeviceUpdatePayload(BaseModel):
    device_name: Optional[str] = None
    status: Optional[str] = None  # "ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"
    notes: Optional[str] = None

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    """
    Lists all registered devices and merges them with live WebSocket connectivity state.
    """
    query = select(Device).order_by(Device.last_seen.desc())
    result = await db.execute(query)
    db_devices = result.scalars().all()
    
    # Active IPs from WebSocket hub
    active_ips = {info.ip for info in ws_hub.active_clients.values()}
    active_dev_ids = {info.device_id for info in ws_hub.active_clients.values()}

    devices_list = []
    for dev in db_devices:
        is_online = (dev.ip_address in active_ips) or (dev.device_id in active_dev_ids)
        devices_list.append({
            "id": dev.id,
            "device_id": dev.device_id,
            "device_name": dev.device_name,
            "ip_address": dev.ip_address,
            "device_type": dev.device_type,
            "status": dev.status,
            "notes": dev.notes,
            "is_online": is_online,
            "last_seen": dev.last_seen.isoformat() if dev.last_seen else None,
            "created_at": dev.created_at.isoformat() if dev.created_at else None,
        })
    return devices_list

@router.patch("/{device_id_or_pk}")
async def update_device(device_id_or_pk: str, payload: DeviceUpdatePayload, db: AsyncSession = Depends(get_db)):
    """
    Updates device status (ALLOWED, BLOCKED, PAUSED, UNKNOWN) or friendly name.
    Takes effect immediately on active WebSocket streams.
    """
    dev = None
    if device_id_or_pk.isdigit():
        dev = await db.get(Device, int(device_id_or_pk))
    if not dev:
        res = await db.execute(select(Device).where(Device.device_id == device_id_or_pk))
        dev = res.scalars().first()
    if not dev:
        res = await db.execute(select(Device).where(Device.ip_address == device_id_or_pk))
        dev = res.scalars().first()

    if not dev:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    if payload.device_name is not None:
        dev.device_name = payload.device_name.strip()

    if payload.notes is not None:
        dev.notes = payload.notes.strip()

    if payload.status is not None:
        status_upper = payload.status.upper().strip()
        if status_upper not in ["ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"]:
            raise HTTPException(status_code=400, detail="Status inválido. Escolha: ALLOWED, BLOCKED, PAUSED ou UNKNOWN.")
        dev.status = status_upper
        # Apply instantly to live WebSocketHub cache
        ws_hub.set_device_status(dev.device_id, status_upper)
        ws_hub.set_device_status(dev.ip_address, status_upper)

    await db.commit()
    await db.refresh(dev)

    return {
        "success": True,
        "message": f"Dispositivo '{dev.device_name}' atualizado para status '{dev.status}'.",
        "device": dev
    }

@router.delete("/{device_id_or_pk}")
async def delete_device(device_id_or_pk: str, db: AsyncSession = Depends(get_db)):
    """
    Removes a device record from the database.
    """
    dev = None
    if device_id_or_pk.isdigit():
        dev = await db.get(Device, int(device_id_or_pk))
    if not dev:
        res = await db.execute(select(Device).where(Device.device_id == device_id_or_pk))
        dev = res.scalars().first()

    if not dev:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    await db.delete(dev)
    await db.commit()
    return {"success": True, "message": f"Dispositivo removido com sucesso."}
