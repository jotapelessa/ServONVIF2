import json
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

class WebSocketHub:
    """
    Manages active WebSocket connections from Desktop UI and Android Clients.
    Dispatches lightweight event payloads (< 1KB) instantly upon motion confirmation.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_event(self, event_data: Dict[str, Any]) -> None:
        if not self.active_connections:
            return

        message = json.dumps(event_data)
        stale_connections = set()

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending to WebSocket client: {e}")
                stale_connections.add(connection)

        for stale in stale_connections:
            self.disconnect(stale)

ws_hub = WebSocketHub()
