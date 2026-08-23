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

    async def connect(self, websocket: WebSocket, device_id: Optional[str] = None, device_type: Optional[str] = None) -> None:
        await websocket.accept()

        client_ip = websocket.client.host if websocket.client else "127.0.0.1"
        dev_id = device_id or f"dev_{client_ip.replace('.', '_')}"
        dev_type = device_type or ("Android TV" if client_ip != "127.0.0.1" else "Web Browser")

        # 1. Register or Load from Database asynchronously
        status = await self._sync_device_to_db(dev_id, client_ip, dev_type)

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

        logger.info(f"📱 WebSocket client connected: {client_ip} ({dev_type}) [Status: {status}]. Total active: {len(self.active_clients)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_clients:
            info = self.active_clients.pop(websocket)
            logger.info(f"WebSocket client disconnected: {info.ip} ({info.device_type}). Remaining: {len(self.active_clients)}")

    async def _sync_device_to_db(self, device_id: str, ip: str, device_type: str) -> str:
        try:
            async with async_session_factory() as session:
                res = await session.execute(select(Device).where(Device.device_id == device_id))
                device = res.scalars().first()
                if not device:
                    res_ip = await session.execute(select(Device).where(Device.ip_address == ip))
                    device = res_ip.scalars().first()

                if device:
                    device.last_seen = datetime.utcnow()
                    device.ip_address = ip
                    session.add(device)
                    await session.commit()
                    return device.status
                else:
                    # Create new registered device (Default: ALLOWED)
                    new_dev = Device(
                        device_id=device_id,
                        device_name=f"{device_type} ({ip})",
                        ip_address=ip,
                        device_type=device_type,
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

        for stale in stale_connections:
            self.disconnect(stale)

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
