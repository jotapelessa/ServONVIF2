from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from engine.config.settings import settings
from engine.database.db import init_db
from engine.api.routes_cameras import router as cameras_router
from engine.api.routes_events import router as events_router
from engine.api.routes_stream import router as stream_router
from engine.api.routes_settings import router as settings_router
from engine.api.routes_devices import router as devices_router
from engine.api.routes_vehicles import router as vehicles_router
from engine.api.websocket_hub import ws_hub
from engine.core.camera_manager import camera_manager
from engine.services.retention_worker import retention_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database...")
    await init_db()
    logger.info("Starting active camera streams...")
    await camera_manager.load_and_start_all_active_cameras()
    logger.info("Starting RetentionWorker...")
    retention_worker.start()

    yield

    # Shutdown
    logger.info("Stopping RetentionWorker...")
    retention_worker.stop()
    logger.info("Stopping all camera streams...")
    camera_manager.stop_all()

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(cameras_router)
app.include_router(events_router)
app.include_router(stream_router)
app.include_router(settings_router)
app.include_router(devices_router)
app.include_router(vehicles_router)

@app.websocket("/ws/events")
async def websocket_events_endpoint(
    websocket: WebSocket,
    device_id: Optional[str] = Query(None),
    device_name: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    manufacturer_model: Optional[str] = Query(None),
    mac_address: Optional[str] = Query(None),
    hardware_fingerprint: Optional[str] = Query(None),
):
    await ws_hub.connect(
        websocket=websocket,
        device_id=device_id,
        device_name=device_name,
        device_type=device_type,
        manufacturer_model=manufacturer_model,
        mac_address=mac_address,
        hardware_fingerprint=hardware_fingerprint
    )
    try:
        while True:
            # Keep-alive receive
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_hub.disconnect(websocket)
