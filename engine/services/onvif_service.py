import asyncio
import base64
import hashlib
import os
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from loguru import logger


class OnvifService:
    """
    High-Performance Asynchronous ONVIF Management Service.
    Supports Image Adjustments (Brightness, Contrast, Saturation, Sharpness, IR/LED Dual Light, WDR),
    Camera Reboot, Time Sync, and Web Portal Redirection.
    """

    @staticmethod
    def _create_ws_security_header(username: Optional[str], password: Optional[str]) -> str:
        """
        Builds ONVIF WS-Security UsernameToken XML header with Nonce, Created, and PasswordDigest.
        """
        if not username:
            return ""
        
        pwd = password or ""
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        nonce_bytes = os.urandom(16)
        nonce_b64 = base64.b64encode(nonce_bytes).decode("ascii")

        # Password_Digest = Base64( SHA-1( raw_nonce + created + raw_password ) )
        sha1 = hashlib.sha1()
        sha1.update(nonce_bytes)
        sha1.update(created.encode("utf-8"))
        sha1.update(pwd.encode("utf-8"))
        digest_b64 = base64.b64encode(sha1.digest()).decode("ascii")

        return f"""
  <s:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>{username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{digest_b64}</wsse:Password>
        <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{nonce_b64}</wsse:Nonce>
        <wsu:Created>{created}</wsu:Created>
      </wsse:UsernameToken>
    </wsse:Security>
  </s:Header>"""

    @classmethod
    async def send_soap_request(
        cls,
        endpoint_url: str,
        soap_body: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: float = 4.0
    ) -> str:
        """
        Executes an ONVIF SOAP request asynchronously in an executor thread.
        """
        security_header = cls._create_ws_security_header(username, password)
        full_envelope = f"""<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tt="http://www.onvif.org/ver10/schema" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">{security_header}
  <s:Body>
    {soap_body}
  </s:Body>
</s:Envelope>"""

        def _blocking_call():
            req = urllib.request.Request(
                endpoint_url,
                data=full_envelope.encode("utf-8"),
                headers={"Content-Type": "application/soap+xml; charset=utf-8"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.read().decode("utf-8", errors="ignore")

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _blocking_call)

    @classmethod
    async def get_imaging_settings(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None,
        source_token: str = "VideoSourceToken"
    ) -> Dict[str, Any]:
        """
        Retrieves current ONVIF brightness, contrast, saturation, sharpness, IR mode and WDR.
        """
        endpoint = f"http://{ip}:{port}/onvif/media_service"
        soap_body = f"""
    <timg:GetImagingSettings>
      <timg:VideoSourceToken>{source_token}</timg:VideoSourceToken>
    </timg:GetImagingSettings>"""

        try:
            xml = await cls.send_soap_request(endpoint, soap_body, username, password)
            
            def _extract_val(tag: str, default: float) -> float:
                m = re.search(rf"<tt:{tag}>([^<]+)</tt:{tag}>", xml)
                if not m:
                    m = re.search(rf"<{tag}>([^<]+)</{tag}>", xml)
                if m:
                    try:
                        return float(m.group(1))
                    except:
                        pass
                return default

            def _extract_str(tag: str, default: str) -> str:
                m = re.search(rf"<tt:{tag}>([^<]+)</tt:{tag}>", xml)
                if not m:
                    m = re.search(rf"<{tag}>([^<]+)</{tag}>", xml)
                return m.group(1).strip() if m else default

            brightness = _extract_val("Brightness", 50.0)
            contrast = _extract_val("Contrast", 50.0)
            saturation = _extract_val("ColorSaturation", 50.0)
            sharpness = _extract_val("Sharpness", 50.0)
            ir_cut_filter = _extract_str("IrCutFilter", "AUTO")
            
            wdr_mode = "OFF"
            wdr_match = re.search(r"<tt:WideDynamicRange>\s*<tt:Mode>([^<]+)</tt:Mode>", xml)
            if wdr_match:
                wdr_mode = wdr_match.group(1).strip()

            return {
                "success": True,
                "brightness": round(brightness, 1),
                "contrast": round(contrast, 1),
                "color_saturation": round(saturation, 1),
                "sharpness": round(sharpness, 1),
                "ir_cut_filter": ir_cut_filter, # AUTO, ON, OFF
                "wdr": wdr_mode, # ON, OFF
                "camera_ip": ip,
                "web_url": f"http://{ip}:{port}"
            }
        except Exception as e:
            logger.warning(f"Failed to get ONVIF imaging for {ip}:{port}: {e}")
            return {
                "success": False,
                "error": str(e),
                "brightness": 50.0,
                "contrast": 50.0,
                "color_saturation": 50.0,
                "sharpness": 50.0,
                "ir_cut_filter": "AUTO",
                "wdr": "OFF",
                "camera_ip": ip,
                "web_url": f"http://{ip}:{port}"
            }

    @classmethod
    async def set_imaging_settings(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None,
        brightness: Optional[float] = None,
        contrast: Optional[float] = None,
        color_saturation: Optional[float] = None,
        sharpness: Optional[float] = None,
        ir_cut_filter: Optional[str] = None,
        wdr: Optional[str] = None,
        source_token: str = "VideoSourceToken"
    ) -> Dict[str, Any]:
        """
        Updates camera image settings directly on the camera DSP hardware via ONVIF.
        """
        endpoint = f"http://{ip}:{port}/onvif/media_service"
        
        # Build inner settings XML
        settings_xml = []
        if brightness is not None:
            settings_xml.append(f"<tt:Brightness>{float(brightness)}</tt:Brightness>")
        if color_saturation is not None:
            settings_xml.append(f"<tt:ColorSaturation>{float(color_saturation)}</tt:ColorSaturation>")
        if contrast is not None:
            settings_xml.append(f"<tt:Contrast>{float(contrast)}</tt:Contrast>")
        if sharpness is not None:
            settings_xml.append(f"<tt:Sharpness>{float(sharpness)}</tt:Sharpness>")
        if ir_cut_filter:
            settings_xml.append(f"<tt:IrCutFilter>{ir_cut_filter.upper()}</tt:IrCutFilter>")
        if wdr:
            settings_xml.append(f"<tt:WideDynamicRange><tt:Mode>{wdr.upper()}</tt:Mode></tt:WideDynamicRange>")

        body_inner = "\n        ".join(settings_xml)

        soap_body = f"""
    <timg:SetImagingSettings>
      <timg:VideoSourceToken>{source_token}</timg:VideoSourceToken>
      <timg:ImagingSettings>
        {body_inner}
      </timg:ImagingSettings>
      <timg:ForcePersistence>true</timg:ForcePersistence>
    </timg:SetImagingSettings>"""

        try:
            await cls.send_soap_request(endpoint, soap_body, username, password)
            logger.info(f"✅ ONVIF Imaging updated successfully on camera {ip}:{port}")
            return {"success": True, "message": "Configurações de imagem aplicadas com sucesso na câmera!"}
        except Exception as e:
            logger.error(f"Failed to set ONVIF imaging on {ip}:{port}: {e}")
            return {"success": False, "message": f"Erro ao aplicar ajustes na câmera: {str(e)}"}

    @classmethod
    async def reboot_camera(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an ONVIF SystemReboot command to gracefully restart the camera hardware.
        """
        endpoint = f"http://{ip}:{port}/onvif/device_service"
        soap_body = """
    <tds:SystemReboot />"""

        try:
            xml = await cls.send_soap_request(endpoint, soap_body, username, password)
            logger.info(f"🔄 Camera {ip}:{port} reboot initiated via ONVIF")
            return {"success": True, "message": "Comando de reinicialização enviado com sucesso para a câmera. Ela estará de volta em ~30 segundos."}
        except Exception as e:
            logger.error(f"Failed to reboot camera {ip}:{port}: {e}")
            return {"success": False, "message": f"Falha ao enviar comando de reinicialização: {str(e)}"}

    @classmethod
    async def sync_camera_time(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None,
        tz_string: str = "BRT+3"
    ) -> Dict[str, Any]:
        """
        Synchronizes camera date, time and timezone (Brasília BRT+3 / UTC-3) via ONVIF SetSystemDateAndTime.
        """
        now = datetime.now(timezone.utc)
        endpoint = f"http://{ip}:{port}/onvif/device_service"
        soap_body = f"""
    <tds:SetSystemDateAndTime>
      <tds:DateTimeType>Manual</tds:DateTimeType>
      <tds:DaylightSavings>false</tds:DaylightSavings>
      <tds:TimeZone>
        <tt:TZ>{tz_string}</tt:TZ>
      </tds:TimeZone>
      <tds:UTCDateTime>
        <tt:Time>
          <tt:Hour>{now.hour}</tt:Hour>
          <tt:Minute>{now.minute}</tt:Minute>
          <tt:Second>{now.second}</tt:Second>
        </tt:Time>
        <tt:Date>
          <tt:Year>{now.year}</tt:Year>
          <tt:Month>{now.month}</tt:Month>
          <tt:Day>{now.day}</tt:Day>
        </tt:Date>
      </tds:UTCDateTime>
    </tds:SetSystemDateAndTime>"""

        try:
            await cls.send_soap_request(endpoint, soap_body, username, password)
            logger.info(f"🕒 Camera {ip}:{port} clock synchronized with Brasília Time ({tz_string})")
            return {"success": True, "message": f"Relógio da câmera sincronizado com o Horário de Brasília ({tz_string})!"}
        except Exception as e:
            logger.error(f"Failed to sync time on camera {ip}:{port}: {e}")
            return {"success": False, "message": f"Falha ao sincronizar relógio: {str(e)}"}


onvif_service = OnvifService()
