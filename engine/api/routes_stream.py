from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import cv2
from engine.services.mjpeg_streamer import mjpeg_streamer
from engine.core.camera_manager import camera_manager

router = APIRouter(tags=["Streaming"])

@router.get("/api/mjpeg/{camera_id}")
@router.get("/api/stream/{camera_id}/live")
async def stream_mjpeg(camera_id: int):
    if camera_id not in camera_manager.ingestors:
        raise HTTPException(status_code=404, detail="Camera is not active or streaming")

    return StreamingResponse(
        mjpeg_streamer.generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/api/cameras/{camera_id}/frame")
@router.get("/api/stream/{camera_id}/frame")
@router.get("/api/mjpeg/{camera_id}/frame")
async def get_live_frame(camera_id: int, quality: str = "main"):
    ingestor = camera_manager.ingestors.get(camera_id)
    if not ingestor:
        raise HTTPException(status_code=404, detail="Camera not active")

    with ingestor._frame_lock:
        if ingestor._latest_frame is None:
            raise HTTPException(status_code=503, detail="No frame available")
        frame = ingestor._latest_frame.copy()

    # Resize if sub quality requested
    if quality == "sub":
        h, w = frame.shape[:2]
        frame = cv2.resize(frame, (w // 2, h // 2), interpolation=cv2.INTER_LINEAR)

    success, encoded_image = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if not success:
        raise HTTPException(status_code=500, detail="Encoding failed")

    return Response(
        content=encoded_image.tobytes(),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
