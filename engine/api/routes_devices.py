import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from loguru import logger

from engine.database.db import get_db, get_system_setting, set_system_setting
from engine.database.models import Device
from engine.api.websocket_hub import ws_hub
from engine.services.backup_service import dispatch_telegram_backup

router = APIRouter(prefix="/api/devices", tags=["Devices"])

class DeviceCreatePayload(BaseModel):
    device_name: str
    ip_address: Optional[str] = "192.168.1.100"
    device_type: Optional[str] = "Android TV"
    manufacturer_model: Optional[str] = None
    mac_address: Optional[str] = None
    status: Optional[str] = "ALLOWED"
    notes: Optional[str] = None

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
    device_type: Optional[str] = None
    manufacturer_model: Optional[str] = None
    mac_address: Optional[str] = None
    status: Optional[str] = None  # "ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"
    notes: Optional[str] = None

class BulkDeviceActionPayload(BaseModel):
    action: str  # "ALLOW_ALL", "PAUSE_ALL", "BLOCK_UNKNOWN", "UNBLOCK_ALL"

class DevicePolicyPayload(BaseModel):
    default_policy: str  # "AUTO_ALLOW", "REQUIRE_APPROVAL", "BLOCK_NEW"

@router.get("/")
async def list_devices(db: AsyncSession = Depends(get_db)):
    """
    Lists all registered devices and merges them with live WebSocket connectivity state.
    Sorted so that recently pinged devices appear at the top.
    """
    query = select(Device).order_by(Device.last_ping_at.desc().nullslast(), Device.last_seen.desc())
    result = await db.execute(query)
    db_devices = result.scalars().all()
    
    # Active IPs and IDs from WebSocket hub
    active_ips = {info.ip for info in ws_hub.active_clients.values()}
    active_dev_ids = {info.device_id for info in ws_hub.active_clients.values()}

    devices_list = []
    online_count = 0
    allowed_count = 0
    blocked_count = 0
    paused_count = 0
    unknown_count = 0

    for dev in db_devices:
        is_online = (dev.ip_address in active_ips) or (dev.device_id in active_dev_ids)
        if is_online:
            online_count += 1

        if dev.status == "ALLOWED":
            allowed_count += 1
        elif dev.status == "BLOCKED":
            blocked_count += 1
        elif dev.status == "PAUSED":
            paused_count += 1
        else:
            unknown_count += 1

        devices_list.append({
            "id": dev.id,
            "device_id": dev.device_id,
            "device_name": dev.device_name,
            "ip_address": dev.ip_address,
            "device_type": dev.device_type,
            "manufacturer_model": dev.manufacturer_model,
            "mac_address": dev.mac_address,
            "hardware_fingerprint": dev.hardware_fingerprint,
            "app_version": dev.app_version,
            "status": dev.status,
            "notes": dev.notes,
            "is_online": is_online,
            "ping_count": dev.ping_count or 0,
            "last_ping_at": dev.last_ping_at.isoformat() if dev.last_ping_at else None,
            "last_seen": dev.last_seen.isoformat() if dev.last_seen else None,
            "created_at": dev.created_at.isoformat() if dev.created_at else None,
        })

    return {
        "devices": devices_list,
        "summary": {
            "total": len(devices_list),
            "online": online_count,
            "allowed": allowed_count,
            "blocked": blocked_count,
            "paused": paused_count,
            "unknown": unknown_count,
        }
    }

@router.post("/")
async def create_device(payload: DeviceCreatePayload, db: AsyncSession = Depends(get_db)):
    """
    Manually creates/registers a new authorized device in the fleet.
    """
    clean_ip = payload.ip_address.strip() if payload.ip_address else "192.168.1.100"
    device_id = f"manual_{clean_ip.replace('.', '_')}_{int(datetime.utcnow().timestamp())}"
    
    # Check if MAC or IP already exists
    if payload.mac_address:
        res = await db.execute(select(Device).where(Device.mac_address == payload.mac_address.strip()))
        if res.scalars().first():
            raise HTTPException(status_code=400, detail=f"Já existe um dispositivo cadastrado com o endereço MAC {payload.mac_address}.")

    status_val = payload.status.upper().strip() if payload.status else "ALLOWED"
    if status_val not in ["ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"]:
        status_val = "ALLOWED"

    now = datetime.utcnow()
    new_dev = Device(
        device_id=device_id,
        device_name=payload.device_name.strip(),
        ip_address=clean_ip,
        device_type=payload.device_type or "Android TV",
        manufacturer_model=payload.manufacturer_model or "Dispositivo Manual",
        mac_address=payload.mac_address.strip().upper() if payload.mac_address else None,
        status=status_val,
        notes=payload.notes.strip() if payload.notes else None,
        ping_count=0,
        last_seen=now,
        created_at=now
    )
    db.add(new_dev)
    await db.commit()
    await db.refresh(new_dev)

    ws_hub.set_device_status(new_dev.device_id, status_val)
    ws_hub.set_device_status(new_dev.ip_address, status_val)

    asyncio.create_task(dispatch_telegram_backup(reason=f"Novo Dispositivo Cadastrado: {new_dev.device_name}"))
    return {"success": True, "message": f"Dispositivo '{new_dev.device_name}' cadastrado com sucesso!", "device": new_dev}

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

@router.post("/test-notify/{device_id_or_pk}")
async def send_device_test_notification(device_id_or_pk: str, db: AsyncSession = Depends(get_db)):
    """
    Sends an instant interactive visual & audio test notification (PiP / Pop-up)
    directly to the specified device via WebSocket.
    """
    dev = None
    if device_id_or_pk.isdigit():
        dev = await db.get(Device, int(device_id_or_pk))
    if not dev:
        res = await db.execute(select(Device).where(Device.device_id == device_id_or_pk))
        dev = res.scalars().first()

    if not dev:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    test_payload = {
        "type": "DEVICE_TEST_NOTIFICATION",
        "title": "🔔 Teste de Notificação ServONVIF",
        "message": f"Conexão com {dev.device_name} validada com sucesso!",
        "camera_id": 1,
        "camera_name": f"🔔 Teste: {dev.device_name}",
        "device_id": dev.device_id,
        "device_name": dev.device_name,
        "score": 1.0,
        "mjpeg_url": "/api/mjpeg/1",
        "timestamp": datetime.utcnow().isoformat(),
        "sound": True
    }

    sent = await ws_hub.send_to_device(dev.device_id, test_payload)
    if not sent:
        sent = await ws_hub.send_to_device(dev.ip_address, test_payload)

    # Always broadcast so all active monitoring screens (TVs, Tablets, Web UI) receive the test
    await ws_hub.broadcast_event(test_payload)
    if not sent and len(ws_hub.active_clients) > 0:
        sent = True

    return {
        "success": True,
        "message": f"Notificação de teste disparada com sucesso para '{dev.device_name}'!",
        "delivered_to_active_socket": sent
    }

@router.post("/bulk-status")
async def bulk_device_action(payload: BulkDeviceActionPayload, db: AsyncSession = Depends(get_db)):
    """
    Applies a batch access control action across all registered fleet devices.
    """
    action = payload.action.upper().strip()
    query = select(Device)
    res = await db.execute(query)
    all_devs = res.scalars().all()

    modified_count = 0
    new_status = "ALLOWED"

    if action == "ALLOW_ALL":
        new_status = "ALLOWED"
    elif action == "PAUSE_ALL":
        new_status = "PAUSED"
    elif action == "BLOCK_UNKNOWN":
        new_status = "BLOCKED"
    elif action == "UNBLOCK_ALL":
        new_status = "ALLOWED"
    else:
        raise HTTPException(status_code=400, detail="Ação inválida. Escolha: ALLOW_ALL, PAUSE_ALL, BLOCK_UNKNOWN ou UNBLOCK_ALL.")

    for dev in all_devs:
        if action == "BLOCK_UNKNOWN" and dev.status != "UNKNOWN":
            continue
        dev.status = new_status
        ws_hub.set_device_status(dev.device_id, new_status)
        ws_hub.set_device_status(dev.ip_address, new_status)
        modified_count += 1

    await db.commit()
    asyncio.create_task(dispatch_telegram_backup(reason=f"Ação em Massa Dispositivos: {action} ({modified_count} afetados)"))

    return {
        "success": True,
        "message": f"Ação '{action}' aplicada com sucesso a {modified_count} dispositivos!",
        "modified_count": modified_count
    }

@router.delete("/cleanup-stale")
async def cleanup_stale_devices(days: int = 30, db: AsyncSession = Depends(get_db)):
    """
    Removes inactive devices that have been offline for more than X days.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = select(Device).where(Device.last_seen < cutoff)
    res = await db.execute(query)
    stale_devs = res.scalars().all()

    count = len(stale_devs)
    for dev in stale_devs:
        await db.delete(dev)

    await db.commit()
    return {"success": True, "message": f"{count} dispositivos inativos (> {days} dias) foram removidos.", "deleted_count": count}

@router.patch("/{device_id_or_pk}")
async def update_device(device_id_or_pk: str, payload: DeviceUpdatePayload, db: AsyncSession = Depends(get_db)):
    """
    Updates device status (ALLOWED, BLOCKED, PAUSED, UNKNOWN), type, MAC, or friendly name.
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

    if payload.device_type is not None:
        dev.device_type = payload.device_type.strip()

    if payload.manufacturer_model is not None:
        dev.manufacturer_model = payload.manufacturer_model.strip()

    if payload.mac_address is not None:
        dev.mac_address = payload.mac_address.strip().upper()

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
        "message": f"Dispositivo '{dev.device_name}' atualizado com sucesso.",
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

