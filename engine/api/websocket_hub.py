import json
import asyncio
from datetime import datetime
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
from sqlalchemy.future import select

from engine.database.db import async_session_factory
from engine.database.models import Device

class WebSocketClientInfo:
    def __init__(self, websocket: WebSocket, ip: str, device_id: str, device_type: str = "Android TV"):
        self.websocket = websocket
        self.ip = ip
        self.device_id = device_id
        self.device_type = device_type
        self.connected_at = datetime.utcnow()
        self.status = "ALLOWED"

class WebSocketHub:
    """
    Manages active WebSocket connections from Desktop UI and Android Clients.
    Features Real-Time Device Access Control (ALLOWED, BLOCKED, PAUSED, UNKNOWN).
    """
    def __init__(self):
        self.active_clients: Dict[WebSocket, WebSocketClientInfo] = {}
        self.ip_status_cache: Dict[str, str] = {}

    @property
    def active_connections(self) -> Set[WebSocket]:
        return set(self.active_clients.keys())

    async def connect(
        self,
        websocket: WebSocket,
        device_id: Optional[str] = None,
        device_name: Optional[str] = None,
        device_type: Optional[str] = None,
        manufacturer_model: Optional[str] = None,
        mac_address: Optional[str] = None,
        hardware_fingerprint: Optional[str] = None,
    ) -> None:
        await websocket.accept()

        client_ip = websocket.client.host if websocket.client else "127.0.0.1"
        dev_id = device_id or f"dev_{client_ip.replace('.', '_')}"
        dev_type = device_type or ("Android TV" if client_ip != "127.0.0.1" else "Web Browser")
        model = manufacturer_model or "Hardware / Desconhecido"

        # 1. Register or Load from Database asynchronously with Multi-Key Hardware Matching
        status = await self._sync_device_to_db(
            device_id=dev_id,
            ip=client_ip,
            device_type=dev_type,
            device_name=device_name,
            manufacturer_model=model,
            mac_address=mac_address,
            hardware_fingerprint=hardware_fingerprint
        )

        client_info = WebSocketClientInfo(
            websocket=websocket,
            ip=client_ip,
            device_id=dev_id,
            device_type=dev_type
        )
        client_info.status = status

        self.active_clients[websocket] = client_info
        self.ip_status_cache[client_ip] = status
        self.ip_status_cache[dev_id] = status

        status_emoji = "🟢" if status == "ALLOWED" else ("🟡" if status == "PAUSED" else "🔴")
        logger.success(
            f"[Dispositivos] 📱 Dispositivo CONECTADO: '{dev_id}' ({dev_type} - {model}) em {client_ip} "
            f"| Status: {status_emoji} {status} | Conexões Ativas: {len(self.active_clients)}"
        )

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_clients:
            info = self.active_clients.pop(websocket)
            logger.warning(
                f"[Dispositivos] 🔌 Dispositivo DESCONECTADO: '{info.device_id}' ({info.device_type} @ {info.ip}) "
                f"| Conexões Restantes: {len(self.active_clients)}"
            )

    async def _sync_device_to_db(
        self,
        device_id: str,
        ip: str,
        device_type: str,
        device_name: Optional[str] = None,
        manufacturer_model: Optional[str] = None,
        mac_address: Optional[str] = None,
        hardware_fingerprint: Optional[str] = None
    ) -> str:
        try:
            async with async_session_factory() as session:
                # Multi-key lookup: By Hardware Device ID, MAC Address, Hardware Fingerprint, or IP
                device = None

                # 1. Direct hardware device_id match
                res = await session.execute(select(Device).where(Device.device_id == device_id))
                device = res.scalars().first()

                # 2. MAC address match
                if not device and mac_address:
                    res_mac = await session.execute(select(Device).where(Device.mac_address == mac_address))
                    device = res_mac.scalars().first()

                # 3. Hardware fingerprint match
                if not device and hardware_fingerprint:
                    res_fp = await session.execute(select(Device).where(Device.hardware_fingerprint == hardware_fingerprint))
                    device = res_fp.scalars().first()

                # 4. Fallback IP match
                if not device:
                    res_ip = await session.execute(select(Device).where(Device.ip_address == ip))
                    device = res_ip.scalars().first()

                if device:
                    # Update dynamic network info (IP may change, but device is the same!)
                    device.last_seen = datetime.utcnow()
                    device.ip_address = ip
                    if mac_address and not device.mac_address:
                        device.mac_address = mac_address
                    if hardware_fingerprint and not device.hardware_fingerprint:
                        device.hardware_fingerprint = hardware_fingerprint
                    if manufacturer_model and (not device.manufacturer_model or device.manufacturer_model.startswith("Genérico")):
                        device.manufacturer_model = manufacturer_model
                    if device_name and (device.device_name.startswith("Dispositivo") or device.device_name.startswith("Android")):
                        device.device_name = device_name
                    session.add(device)
                    await session.commit()
                    return device.status
                else:
                    # Create new registered device
                    final_name = device_name or f"{device_type} ({manufacturer_model or ip})"
                    new_dev = Device(
                        device_id=device_id,
                        device_name=final_name,
                        ip_address=ip,
                        device_type=device_type,
                        manufacturer_model=manufacturer_model,
                        mac_address=mac_address,
                        hardware_fingerprint=hardware_fingerprint,
                        status="ALLOWED",
                        last_seen=datetime.utcnow()
                    )
                    session.add(new_dev)
                    await session.commit()
                    await session.refresh(new_dev)
                    return new_dev.status
        except Exception as e:
            logger.warning(f"Error syncing device to DB: {e}")
            return "ALLOWED"

    def set_device_status(self, device_id_or_ip: str, new_status: str) -> None:
        self.ip_status_cache[device_id_or_ip] = new_status
        for info in self.active_clients.values():
            if info.ip == device_id_or_ip or info.device_id == device_id_or_ip:
                info.status = new_status

    async def broadcast_event(self, event_data: Dict[str, Any], allowed_device_ids: Optional[List[str]] = None) -> None:
        if not self.active_clients:
            return

        message = json.dumps(event_data)
        stale_connections = set()

        for ws, info in list(self.active_clients.items()):
            # 1. Check Global Device Access Permission
            cached_status = self.ip_status_cache.get(info.ip, info.status)
            if cached_status != "ALLOWED":
                continue

            # 2. Check Camera-Specific Device Whitelist (if camera has specific devices selected)
            if allowed_device_ids and len(allowed_device_ids) > 0:
                if info.device_id not in allowed_device_ids and info.ip not in allowed_device_ids and info.device_type != "Web Browser":
                    # Skip alerting this device for this specific camera
                    continue

            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending to WebSocket client {info.ip}: {e}")
                stale_connections.add(ws)

    async def send_to_device(self, device_id_or_ip: str, event_data: Dict[str, Any]) -> bool:
        """Sends a targeted real-time WebSocket event directly to a specific connected device."""
        if not self.active_clients:
            return False
        message = json.dumps(event_data)
        sent = False
        target = str(device_id_or_ip).strip()
        for ws, info in list(self.active_clients.items()):
            # Robust matching: Exact match, IP match, prefix match, or substring match
            is_match = (
                info.device_id == target or
                info.ip == target or
                (target and info.device_id and target in info.device_id) or
                (target and info.device_id and info.device_id in target) or
                (target and info.ip and target in info.ip)
            )
            if is_match:
                try:
                    await ws.send_text(message)
                    sent = True
                    logger.info(f"🔔 Targeted test push DELIVERED to WebSocket: {info.device_id} @ {info.ip}")
                except Exception as e:
                    logger.warning(f"Error sending targeted push to {info.ip}: {e}")
                    self.disconnect(ws)
        return sent

    @property
    def unique_devices_count(self) -> int:
        unique_devs = {info.device_id or info.ip for info in self.active_clients.values()}
        return len(unique_devs)

    async def prune_stale_connections(self) -> int:
        """Sends a lightweight ping to verify socket health and prune disconnected sessions."""
        if not self.active_clients:
            return 0
        ping_msg = json.dumps({"type": "HEARTBEAT_PING", "timestamp": datetime.utcnow().isoformat()})
        dead = []
        for ws, info in list(self.active_clients.items()):
            try:
                await ws.send_text(ping_msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
        return len(dead)

    async def broadcast_motion_alert(
        self,
        camera_id: int,
        camera_name: str,
        score: float,
        mjpeg_url: str,
        allowed_device_ids: Optional[List[str]] = None
    ) -> None:
        payload = {
            "type": "MOTION_ALERT",
            "camera_id": camera_id,
            "camera_name": camera_name,
            "score": score,
            "mjpeg_url": mjpeg_url,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_event(payload, allowed_device_ids=allowed_device_ids)

ws_hub = WebSocketHub()
