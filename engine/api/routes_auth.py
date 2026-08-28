import asyncio
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from loguru import logger

from engine.database.db import get_db
from engine.database.models import Device
from engine.api.websocket_hub import ws_hub
from engine.api.routes_settings import get_local_ip
from engine.services.tailscale_service import TailscaleService

router = APIRouter(prefix="/api/auth", tags=["Authentication & Mobile Pairing"])

# In-memory ephemeral pairing tokens: token -> { "created_at": float, "expires_at": float, "is_claimed": bool }
ACTIVE_PAIRING_TOKENS: Dict[str, Dict[str, Any]] = {}

tailscale_service = TailscaleService()

class MobileVerifyPayload(BaseModel):
    token: str
    device_name: Optional[str] = "Smartphone"
    device_type: Optional[str] = "Smartphone"
    manufacturer_model: Optional[str] = "Dispositivo Móvel"
    hardware_fingerprint: Optional[str] = None
    app_version: Optional[str] = "1.0.0"

class MobileDirectLoginPayload(BaseModel):
    server_pin: Optional[str] = None
    device_name: Optional[str] = "Smartphone"
    manufacturer_model: Optional[str] = "Dispositivo Móvel"

@router.get("/connection-info")
async def get_connection_info():
    """
    Returns the network addresses (Local LAN and Tailscale MagicDNS / IP)
    for smartphones to automatically configure their network dialer.
    """
    local_ip = get_local_ip()
    ts_status = tailscale_service.get_status()
    tailscale_ip = ts_status.get("tailscale_ip")
    magicdns_name = ts_status.get("magicdns_hostname") or ts_status.get("self_node_name")

    tailscale_url = None
    tailscale_ip_url = None
    if tailscale_ip:
        tailscale_ip_url = f"http://{tailscale_ip}:8080"

    if magicdns_name:
        clean_name = magicdns_name
        if clean_name.startswith("https://"):
            clean_name = clean_name.replace("https://", "http://")
        elif not clean_name.startswith("http://"):
            clean_name = f"http://{clean_name}"
        if not clean_name.endswith(":8080") and ":8080" not in clean_name:
            clean_name = f"{clean_name}:8080"
        tailscale_url = clean_name
    elif tailscale_ip_url:
        tailscale_url = tailscale_ip_url

    funnel_url = ts_status.get("funnel_url")
    if not funnel_url and magicdns_name:
        clean_funnel = magicdns_name.replace("http://", "").replace("https://", "").split(":")[0]
        funnel_url = f"https://{clean_funnel}"

    return {
        "lan_ip": local_ip,
        "lan_url": f"http://{local_ip}:8080",
        "tailscale_ip": tailscale_ip,
        "tailscale_ip_url": tailscale_ip_url,
        "tailscale_url": tailscale_url,
        "funnel_url": funnel_url,
        "is_funnel_active": ts_status.get("is_funnel_active", False) or bool(funnel_url),
        "magicdns_hostname": magicdns_name,
        "is_tailscale_running": ts_status.get("is_running", False),
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.post("/generate-pair-token")
async def generate_pairing_token():
    """
    Generates a secure, short-lived (15-minute) pairing token and bundle
    to be displayed as a QR Code in the web dashboard for instant smartphone onboarding.
    """
    token = f"pair_{secrets.token_urlsafe(16)}"
    now = time.time()
    expires_at = now + 900  # 15 minutes

    ACTIVE_PAIRING_TOKENS[token] = {
        "created_at": now,
        "expires_at": expires_at,
        "is_claimed": False,
    }

    conn_info = await get_connection_info()

    payload_bundle = {
        "app": "ServONVIF_Mobile",
        "token": token,
        "lan_url": conn_info["lan_url"],
        "tailscale_url": conn_info["tailscale_url"],
        "tailscale_ip_url": conn_info.get("tailscale_ip_url"),
        "funnel_url": conn_info.get("funnel_url"),
        "expires_at": int(expires_at),
        "server_name": "ServONVIF Hub",
    }

    return {
        "success": True,
        "token": token,
        "expires_in_seconds": 900,
        "pairing_bundle": payload_bundle,
        "connection_info": conn_info,
    }

@router.post("/mobile-verify")
async def verify_mobile_pairing(
    payload: MobileVerifyPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Called by the smartphone app upon scanning the QR code or submitting the pairing token.
    Validates the token, auto-registers the smartphone in the fleet database, and issues an active session token.
    """
    token_entry = ACTIVE_PAIRING_TOKENS.get(payload.token)
    if not token_entry:
        raise HTTPException(status_code=401, detail="Token de emparelhamento inválido ou inexistente.")

    if time.time() > token_entry["expires_at"]:
        ACTIVE_PAIRING_TOKENS.pop(payload.token, None)
        raise HTTPException(status_code=401, detail="Token de emparelhamento expirado. Gere um novo QR Code.")

    token_entry["is_claimed"] = True

    client_ip = request.client.host if request.client else "127.0.0.1"
    device_id = f"mobile_{client_ip.replace('.', '_')}_{secrets.token_hex(4)}"

    now = datetime.utcnow()
    # Check if a device with this fingerprint or IP already exists
    dev = None
    if payload.hardware_fingerprint:
        res = await db.execute(select(Device).where(Device.hardware_fingerprint == payload.hardware_fingerprint))
        dev = res.scalars().first()

    if not dev:
        dev = Device(
            device_id=device_id,
            device_name=payload.device_name or "Smartphone Pessoal",
            ip_address=client_ip,
            device_type="Smartphone",
            manufacturer_model=payload.manufacturer_model or "Smartphone Android/iOS",
            hardware_fingerprint=payload.hardware_fingerprint,
            app_version=payload.app_version or "1.0.0",
            status="ALLOWED",
            ping_count=1,
            last_seen=now,
            last_ping_at=now,
            notes="Emparelhado via QR Code / ServONVIF Mobile App",
            created_at=now,
        )
        db.add(dev)
    else:
        dev.last_seen = now
        dev.last_ping_at = now
        dev.status = "ALLOWED"
        dev.ip_address = client_ip
        if payload.device_name:
            dev.device_name = payload.device_name
        if payload.manufacturer_model:
            dev.manufacturer_model = payload.manufacturer_model

    await db.commit()
    await db.refresh(dev)

    ws_hub.set_device_status(dev.device_id, "ALLOWED")
    ws_hub.set_device_status(dev.ip_address, "ALLOWED")

    # Generate persistent session token for the mobile app
    session_token = f"sess_{secrets.token_urlsafe(32)}"

    logger.info(f"📱 SMARTPHONE AUTHENTICATED: [{dev.device_name}] ({dev.manufacturer_model}) at IP {client_ip}")

    # Broadcast notification to web dashboard
    await ws_hub.broadcast_event({
        "type": "DEVICE_AUTHENTICATED",
        "device_id": dev.device_id,
        "device_name": dev.device_name,
        "device_type": dev.device_type,
        "ip_address": dev.ip_address,
        "timestamp": now.isoformat(),
    })

    conn_info = await get_connection_info()

    return {
        "success": True,
        "message": f"Smartphone '{dev.device_name}' emparelhado e autorizado com sucesso!",
        "session_token": session_token,
        "device": {
            "id": dev.id,
            "device_id": dev.device_id,
            "device_name": dev.device_name,
            "status": dev.status,
            "ip_address": dev.ip_address,
        },
        "connection_info": conn_info,
    }
