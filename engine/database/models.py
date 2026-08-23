from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON

class Camera(SQLModel, table=True):
    __tablename__ = "cameras"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    rtsp_url: str
    ip_address: Optional[str] = None
    onvif_port: Optional[int] = 80
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: bool = Field(default=True)
    sensitivity: float = Field(default=0.03)  # Motion threshold 0.01 - 0.10
    roi_polygon: Optional[List[List[float]]] = Field(default=None, sa_column=Column(JSON))  # Normalized [[x1, y1], [x2, y2], ...]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MotionEvent(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    camera_id: int = Field(foreign_key="cameras.id", index=True)
    camera_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    score: float = Field(default=0.0)
    video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    telegram_sent: bool = Field(default=False)
    duration_seconds: float = Field(default=0.0)
