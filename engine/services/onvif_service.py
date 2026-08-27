import asyncio
import base64
import hashlib
import os
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from loguru import logger
import numpy as np
import cv2


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

    @classmethod
    async def get_camera_profiles(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Queries ONVIF Media Service to list all stream profiles (MAIN, SUB),
        their resolutions, encoding codecs, frame rates, bitrates, and RTSP stream URIs.
        """
        def _blocking_get_profiles():
            from onvif import ONVIFCamera
            results = []
            try:
                cam = ONVIFCamera(ip, port, username or "", password or "")
                media = cam.create_media_service()
                profiles = media.GetProfiles()
                for p in profiles:
                    token = getattr(p, 'token', '')
                    name = getattr(p, 'Name', '')
                    width = 0
                    height = 0
                    encoding = "H264"
                    fps_limit = 25
                    bitrate = 0
                    quality = 3.0
                    if hasattr(p, 'VideoEncoderConfiguration') and p.VideoEncoderConfiguration:
                        v = p.VideoEncoderConfiguration
                        encoding = getattr(v, 'Encoding', 'H264')
                        if hasattr(v, 'Resolution') and v.Resolution:
                            width = getattr(v.Resolution, 'Width', 0)
                            height = getattr(v.Resolution, 'Height', 0)
                        if hasattr(v, 'RateControl') and v.RateControl:
                            fps_limit = getattr(v.RateControl, 'FrameRateLimit', 25)
                            bitrate = getattr(v.RateControl, 'BitrateLimit', 0)
                        quality = getattr(v, 'Quality', 3.0)
                    
                    rtsp_uri = ""
                    try:
                        stream_setup = {'StreamSetup': {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}}, 'ProfileToken': token}
                        uri_res = media.GetStreamUri(stream_setup)
                        raw_uri = getattr(uri_res, 'Uri', '')
                        if username and password and "@" not in raw_uri:
                            rtsp_uri = raw_uri.replace("rtsp://", f"rtsp://{username}:{password}@")
                        else:
                            rtsp_uri = raw_uri
                    except Exception as e:
                        logger.warning(f"Could not get stream URI for profile {token}: {e}")

                    mp = round((width * height) / 1000000.0, 2) if (width and height) else 0.0
                    results.append({
                        "token": token,
                        "name": name,
                        "width": width,
                        "height": height,
                        "megapixels": mp,
                        "encoding": encoding,
                        "fps_limit": fps_limit,
                        "bitrate_kbps": bitrate,
                        "quality": quality,
                        "rtsp_uri": rtsp_uri,
                        "is_main": "main" in name.lower() or "000" in token.lower() or mp >= 2.0 or width >= 1920
                    })
            except Exception as err:
                logger.error(f"ONVIF GetProfiles failed on {ip}:{port}: {err}")
            return results

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _blocking_get_profiles)

    @classmethod
    async def audit_sensor_quality(
        cls,
        ip: str,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None,
        current_rtsp_url: Optional[str] = None,
        latest_frame: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Executes a comprehensive hardware and optical sensor diagnostic test.
        """
        profiles = await cls.get_camera_profiles(ip, port, username, password)

        # Probe current frame metrics
        frame = latest_frame
        if frame is None and current_rtsp_url:
            def _grab_sample():
                try:
                    cap = cv2.VideoCapture(current_rtsp_url)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    ret, f = cap.read()
                    cap.release()
                    return f if ret else None
                except Exception:
                    return None
            loop = asyncio.get_running_loop()
            frame = await loop.run_in_executor(None, _grab_sample)

        active_w, active_h = (0, 0)
        active_mp = 0.0
        sharpness_score = 0.0
        contrast_score = 0.0
        luma_mean = 0.0

        if frame is not None:
            active_h, active_w = frame.shape[:2]
            active_mp = round((active_w * active_h) / 1000000.0, 2)
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            sharpness_score = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1)
            contrast_score = round(float(gray.std()), 1)
            luma_mean = round(float(gray.mean()), 1)

        # Determine classification
        if active_mp >= 4.0:
            classification = "Ultra HD 5MP (3K Sensor Nativo)"
            quality_badge = "EXCELLENT"
        elif active_mp >= 2.5:
            classification = "Super HD 3MP / 2K QHD (Alta Definição)"
            quality_badge = "GOOD"
        elif active_mp >= 1.8:
            classification = "Full HD 1080p (Padrão 2MP)"
            quality_badge = "STANDARD"
        elif active_mp >= 0.8:
            classification = "HD 720p (Resolução Média)"
            quality_badge = "FAIR"
        else:
            classification = "Sub-Stream CIF / D1 (Baixa Resolução - 0.36 MP)"
            quality_badge = "LOW"

        # Find best available ONVIF profile
        best_profile = None
        if profiles:
            best_profile = max(profiles, key=lambda p: (p.get("width", 0) * p.get("height", 0)))

        is_substream = False
        upgrade_available = False
        recommended_url = None

        if best_profile and best_profile.get("rtsp_uri"):
            best_uri = best_profile.get("rtsp_uri", "")
            curr_uri = current_rtsp_url or ""
            is_already_main = (
                (best_uri and best_uri in curr_uri) or
                ("/main" in curr_uri.lower()) or
                (active_w >= 1920)
            )
            if not is_already_main and (active_w < 1280 or active_mp < 1.0) and best_profile.get("width", 0) >= 1920:
                is_substream = True
                upgrade_available = True
                recommended_url = best_uri

        # Focus analysis
        if sharpness_score >= 120:
            focus_status = "Excelente (Lente Nítida e Foco Calibrado)"
        elif sharpness_score >= 50:
            focus_status = "Bom (Foco Aceitável)"
        else:
            focus_status = "Atenção (Lente embaçada, fora de foco ou sensor interpolado)"

        return {
            "success": True,
            "active_stream": {
                "url": current_rtsp_url,
                "width": active_w,
                "height": active_h,
                "megapixels": active_mp,
                "aspect_ratio": f"{active_w}:{active_h}" if active_w else "Desconhecido",
                "classification": classification,
                "quality_badge": quality_badge,
                "sharpness_score": sharpness_score,
                "focus_status": focus_status,
                "contrast_score": contrast_score,
                "luma_mean": luma_mean,
                "is_substream": is_substream
            },
            "profiles": profiles,
            "best_profile": best_profile,
            "upgrade_available": upgrade_available,
            "recommended_url": recommended_url,
            "tested_at": datetime.now(timezone.utc).isoformat()
        }


onvif_service = OnvifService()
