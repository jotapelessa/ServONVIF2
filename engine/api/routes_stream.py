from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from engine.services.mjpeg_streamer import mjpeg_streamer
from engine.core.camera_manager import camera_manager

router = APIRouter(prefix="/api/mjpeg", tags=["Streaming"])

@router.get("/{camera_id}")
async def stream_mjpeg(camera_id: int):
    if camera_id not in camera_manager.ingestors:
        raise HTTPException(status_code=404, detail="Camera is not active or streaming")

    return StreamingResponse(
        mjpeg_streamer.generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
