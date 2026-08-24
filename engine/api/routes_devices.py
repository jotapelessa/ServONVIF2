import asyncio
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from loguru import logger

from engine.database.db import get_db
from engine.database.models import Device
from engine.api.websocket_hub import ws_hub
from engine.services.backup_service import dispatch_telegram_backup

router = APIRouter(prefix="/api/devices", tags=["Devices"])

class DevicePingPayload(BaseModel):
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    manufacturer_model: Optional[str] = None
    mac_address: Optional[str] = None
    hardware_fingerprint: Optional[str] = None
    app_version: Optional[str] = None

class DeviceUpdatePayload(BaseModel):
    device_name: Optional[str] = None
    status: Optional[str] = None  # "ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"
    notes: Optional[str] = None

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    """
    Lists all registered devices and merges them with live WebSocket connectivity state.
    Sorted so that recently pinged devices appear at the top.
    """
    query = select(Device).order_by(Device.last_ping_at.desc().nullslast(), Device.last_seen.desc())
    result = await db.execute(query)
    db_devices = result.scalars().all()
    
    # Active IPs from WebSocket hub
    active_ips = {info.ip for info in ws_hub.active_clients.values()}
    active_dev_ids = {info.device_id for info in ws_hub.active_clients.values()}

    devices_list = []
    for idx, dev in enumerate(db_devices):
        is_online = (dev.ip_address in active_ips) or (dev.device_id in active_dev_ids)
        devices_list.append({
            "id": dev.id,
            "device_id": dev.device_id,
            "device_name": dev.device_name,
            "ip_address": dev.ip_address,
            "device_type": dev.device_type,
            "manufacturer_model": dev.manufacturer_model,
            "mac_address": dev.mac_address,
            "hardware_fingerprint": dev.hardware_fingerprint,
            "status": dev.status,
            "notes": dev.notes,
            "is_online": is_online,
            "ping_count": dev.ping_count or 0,
            "last_ping_at": dev.last_ping_at.isoformat() if dev.last_ping_at else None,
            "last_seen": dev.last_seen.isoformat() if dev.last_seen else None,
            "created_at": dev.created_at.isoformat() if dev.created_at else None,
        })
    return devices_list

@router.post("/ping")
async def register_device_ping(payload: DevicePingPayload, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Endpoint called when an Android TV, Tablet or Phone runs a Ping / Test.
    Records the device identity and timestamps, allowing administrators to immediately
    identify which physical device triggered the test.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    device_id = payload.device_id or f"dev_{client_ip.replace('.', '_')}"
    device_type = payload.device_type or ("Android TV" if client_ip != "127.0.0.1" else "Web Browser")
    model = payload.manufacturer_model or "Genérico / Desconhecido"

    # Multi-Key Hardware Matching: ID -> MAC -> Fingerprint -> IP
    dev = None
    res = await db.execute(select(Device).where(Device.device_id == device_id))
    dev = res.scalars().first()

    if not dev and payload.mac_address:
        res_mac = await db.execute(select(Device).where(Device.mac_address == payload.mac_address))
        dev = res_mac.scalars().first()

    if not dev and payload.hardware_fingerprint:
        res_fp = await db.execute(select(Device).where(Device.hardware_fingerprint == payload.hardware_fingerprint))
        dev = res_fp.scalars().first()

    if not dev:
        res_ip = await db.execute(select(Device).where(Device.ip_address == client_ip))
        dev = res_ip.scalars().first()

    now = datetime.utcnow()
    if dev:
        # Update dynamic IP and ping metadata without creating duplicate device
        dev.last_seen = now
        dev.last_ping_at = now
        dev.ip_address = client_ip
        dev.ping_count = (dev.ping_count or 0) + 1
        if payload.manufacturer_model:
            dev.manufacturer_model = payload.manufacturer_model
        if payload.device_type:
            dev.device_type = payload.device_type
        if payload.mac_address and not dev.mac_address:
            dev.mac_address = payload.mac_address
        if payload.hardware_fingerprint and not dev.hardware_fingerprint:
            dev.hardware_fingerprint = payload.hardware_fingerprint
        if payload.app_version:
            dev.app_version = payload.app_version
        if (dev.device_name.startswith("Dispositivo Desconhecido") or dev.device_name.startswith("Android TV (")) and payload.device_name:
            dev.device_name = payload.device_name
    else:
        name = payload.device_name or f"{device_type} ({model} - {client_ip})"
        dev = Device(
            device_id=device_id,
            device_name=name,
            ip_address=client_ip,
            device_type=device_type,
            manufacturer_model=model,
            mac_address=payload.mac_address,
            hardware_fingerprint=payload.hardware_fingerprint,
            app_version=payload.app_version,
            status="ALLOWED",
            ping_count=1,
            last_ping_at=now,
            last_seen=now
        )
        db.add(dev)

    await db.commit()
    await db.refresh(dev)

    logger.info(f"🎯 PING TEST RECEIVED from [{dev.device_name}] (ID: {dev.device_id}, IP: {client_ip}, Model: {model})! Ping #{dev.ping_count}")

    # Broadcast event to Web UI so the web dashboard live-highlights this device immediately!
    await ws_hub.broadcast_event({
        "type": "DEVICE_PING_TEST",
        "device_id": dev.device_id,
        "device_name": dev.device_name,
        "ip_address": dev.ip_address,
        "device_type": dev.device_type,
        "manufacturer_model": dev.manufacturer_model,
        "last_ping_at": dev.last_ping_at.isoformat()
    })

    return {
        "success": True,
        "message": f"Ping registrado com sucesso no ServONVIF para '{dev.device_name}'!",
        "device": {
            "id": dev.id,
            "device_id": dev.device_id,
            "device_name": dev.device_name,
            "ip_address": dev.ip_address,
            "status": dev.status,
            "ping_count": dev.ping_count,
            "last_ping_at": dev.last_ping_at.isoformat()
        }
    }

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

    asyncio.create_task(dispatch_telegram_backup(reason=f"Dispositivo Atualizado: {dev.device_name} (Status: {dev.status})"))

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

    dev_name = dev.device_name
    await db.delete(dev)
    await db.commit()
    asyncio.create_task(dispatch_telegram_backup(reason=f"Dispositivo Excluído: {dev_name}"))
    return {"success": True, "message": f"Dispositivo removido com sucesso."}
