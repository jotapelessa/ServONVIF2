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
    allowed_device_ids: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))   # Dispositivos autorizados para esta camera
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

class Device(SQLModel, table=True):
    __tablename__ = "devices"

    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: str = Field(index=True, unique=True)
    device_name: str = Field(default="Dispositivo Desconhecido")
    ip_address: str = Field(index=True)
    device_type: str = Field(default="Android TV")  # "Android TV", "Tablet", "Mobile", "Web Browser"
    manufacturer_model: Optional[str] = None       # ex: "TCL 9491G", "Samsung Galaxy Tab", "Xiaomi Mi Box 4K"
    mac_address: Optional[str] = Field(default=None, index=True) # Endereço MAC físico do dispositivo
    hardware_fingerprint: Optional[str] = Field(default=None, index=True) # Hash SHA-256 do Hardware
    app_version: Optional[str] = None
    status: str = Field(default="ALLOWED")          # "ALLOWED", "BLOCKED", "PAUSED", "UNKNOWN"
    notes: Optional[str] = None
    ping_count: int = Field(default=0)
    last_ping_at: Optional[datetime] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Vehicle(SQLModel, table=True):
    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    plate_number: str = Field(index=True, unique=True)  # ex: "BRA2E19" ou "ABC1234"
    owner_name: str = Field(index=True)                 # ex: "João Paulo"
    vehicle_model: str = Field(default="Não informado") # ex: "Honda Civic Preto"
    category: str = Field(default="MORADOR")           # "MORADOR", "VISITANTE", "PRESTADOR", "BLOQUEADO"
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    total_detections: int = Field(default=0)
    last_seen_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlateDetectionLog(SQLModel, table=True):
    __tablename__ = "plate_detection_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    camera_id: int = Field(index=True)
    camera_name: str
    plate_number: str = Field(index=True)
    confidence: float = Field(default=0.95)
    category: str = Field(default="DESCONHECIDO")      # "MORADOR", "VISITANTE", "PRESTADOR", "BLOQUEADO", "DESCONHECIDO"
    owner_name: Optional[str] = None
    vehicle_model: Optional[str] = None
    snapshot_path: Optional[str] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow, index=True)
