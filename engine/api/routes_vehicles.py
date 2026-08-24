import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from engine.database.db import get_db
from engine.database.models import Vehicle, PlateDetectionLog
from engine.services.lpr_engine import lpr_engine
from engine.services.backup_service import dispatch_telegram_backup

router = APIRouter(prefix="/api/vehicles", tags=["vehicles-lpr"])

class VehicleCreate(BaseModel):
    plate_number: str
    owner_name: str
    vehicle_model: Optional[str] = "Não informado"
    category: Optional[str] = "MORADOR"  # "MORADOR", "VISITANTE", "PRESTADOR", "BLOQUEADO"
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = None
    owner_name: Optional[str] = None
    vehicle_model: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class PlateSimulationRequest(BaseModel):
    camera_id: Optional[int] = 1
    camera_name: Optional[str] = "Câmera Portão"
    plate_number: str
    confidence: Optional[float] = 0.98

@router.get("/", response_model=List[Vehicle])
async def list_vehicles(session: AsyncSession = Depends(get_db)):
    """Lista todos os veículos cadastrados"""
    statement = select(Vehicle).order_by(Vehicle.created_at.desc())
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/", response_model=Vehicle, status_code=status.HTTP_201_CREATED)
async def create_vehicle(payload: VehicleCreate, session: AsyncSession = Depends(get_db)):
    """Cadastra um novo veículo/morador no sistema"""
    cleaned_plate = lpr_engine.clean_plate_text(payload.plate_number)
    
    # Check if plate already exists
    statement = select(Vehicle).where(Vehicle.plate_number == cleaned_plate)
    result = await session.execute(statement)
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A placa '{cleaned_plate}' já está cadastrada para '{existing.owner_name}'."
        )

    vehicle = Vehicle(
        plate_number=cleaned_plate,
        owner_name=payload.owner_name.strip(),
        vehicle_model=(payload.vehicle_model or "Não informado").strip(),
        category=payload.category or "MORADOR",
        notes=payload.notes,
        is_active=payload.is_active if payload.is_active is not None else True,
        created_at=datetime.utcnow()
    )
    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)
    asyncio.create_task(dispatch_telegram_backup(reason=f"Novo Veículo Cadastrado: {vehicle.plate_number} ({vehicle.owner_name})"))
    return vehicle

@router.patch("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    session: AsyncSession = Depends(get_db)
):
    """Atualiza dados de um veículo cadastrado"""
    statement = select(Vehicle).where(Vehicle.id == vehicle_id)
    result = await session.execute(statement)
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado.")

    if payload.plate_number is not None:
        vehicle.plate_number = lpr_engine.clean_plate_text(payload.plate_number)
    if payload.owner_name is not None:
        vehicle.owner_name = payload.owner_name.strip()
    if payload.vehicle_model is not None:
        vehicle.vehicle_model = payload.vehicle_model.strip()
    if payload.category is not None:
        vehicle.category = payload.category
    if payload.notes is not None:
        vehicle.notes = payload.notes
    if payload.is_active is not None:
        vehicle.is_active = payload.is_active

    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)
    asyncio.create_task(dispatch_telegram_backup(reason=f"Veículo Atualizado: {vehicle.plate_number} ({vehicle.owner_name})"))
    return vehicle

@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: int, session: AsyncSession = Depends(get_db)):
    """Remove um veículo do cadastro"""
    statement = select(Vehicle).where(Vehicle.id == vehicle_id)
    result = await session.execute(statement)
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado.")

    plate_name = vehicle.plate_number
    await session.delete(vehicle)
    await session.commit()
    asyncio.create_task(dispatch_telegram_backup(reason=f"Veículo Excluído: {plate_name}"))
    return {"success": True, "message": f"Veículo {plate_name} removido com sucesso."}

@router.get("/logs", response_model=List[PlateDetectionLog])
async def list_plate_logs(
    limit: int = 50,
    session: AsyncSession = Depends(get_db)
):
    """Lista os últimos registros de placas detectadas pelas câmeras"""
    statement = select(PlateDetectionLog).order_by(PlateDetectionLog.detected_at.desc()).limit(limit)
    result = await session.execute(statement)
    return result.scalars().all()

@router.post("/simulate-plate")
async def simulate_plate_detection(
    payload: PlateSimulationRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Simula uma leitura de placa em tempo real para testes:
    Processa regras de negócio, salva no log e dispara WebSocket para TV Android e Painel Web.
    """
    detection_result = await lpr_engine.process_plate_detection(
        session=session,
        camera_id=payload.camera_id or 1,
        camera_name=payload.camera_name or "Câmera Portão Principal",
        raw_plate=payload.plate_number,
        confidence=payload.confidence or 0.98
    )
    return {"success": True, "detection": detection_result}
