import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from loguru import logger

from engine.config.settings import settings
from engine.database.db import init_db
from engine.core.camera_manager import camera_manager
from engine.services.retention_worker import retention_worker
from engine.api.websocket_hub import ws_hub
from engine.api.routes_cameras import router as cameras_router
from engine.api.routes_events import router as events_router
from engine.api.routes_stream import router as stream_router
from engine.api.routes_settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database...")
    await init_db()
    logger.info("Starting active camera streams...")
    loop = asyncio.get_running_loop()
    await camera_manager.initialize(loop)
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

@app.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await ws_hub.connect(websocket)
    try:
        while True:
            # Keep-alive receive
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_hub.disconnect(websocket)

# Serve static frontend UI if exported (ui/out)
ui_out_dir = settings.BASE_DIR.parent / "ui" / "out"
if ui_out_dir.exists():
    app.mount("/", StaticFiles(directory=str(ui_out_dir), html=True), name="static-ui")
