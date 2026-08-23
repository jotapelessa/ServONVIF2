import asyncio
import socket
import re
from typing import List, Dict, Any
from loguru import logger
from engine.api.routes_settings import get_local_ip

class ONVIFDiscovery:
    """
    Dual-engine camera discovery:
    1. WS-Discovery (UDP Multicast on 239.255.255.250:3702) for standard ONVIF devices.
    2. High-speed concurrent RTSP Port Scanner (554, 8554, 8000) for all local subnet IP cameras.
    """

    WS_DISCOVERY_PROBE = """<?xml version="1.0" encoding="UTF-8"?>
    <e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
                xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
                xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
                xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
        <e:Header>
            <w:MessageID>uuid:84ede3de-7dec-11d0-c360-f01234567890</w:MessageID>
            <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
            <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
        </e:Header>
        <e:Body>
            <d:Probe>
                <d:Types>dn:NetworkVideoTransmitter</d:Types>
            </d:Probe>
        </e:Body>
    </e:Envelope>"""

    @classmethod
    async def discover_cameras(cls, timeout_seconds: float = 2.5) -> List[Dict[str, Any]]:
        """
        Runs both ONVIF WS-Discovery and concurrent Subnet RTSP Scanner in parallel.
        """
        discovered_map: Dict[str, Dict[str, Any]] = {}

        # 1. Run ONVIF WS-Discovery
        try:
            onvif_results = await cls._discover_onvif(timeout_seconds=timeout_seconds)
            for cam in onvif_results:
                discovered_map[cam["ip"]] = cam
        except Exception as e:
            logger.warning(f"ONVIF WS-Discovery encountered error: {e}")

        # 2. Run High-Speed Subnet RTSP Scan
        try:
            rtsp_results = await cls._scan_subnet_rtsp(timeout_per_host=0.4)
            for cam in rtsp_results:
                if cam["ip"] not in discovered_map:
                    discovered_map[cam["ip"]] = cam
        except Exception as e:
            logger.warning(f"RTSP Subnet Scan encountered error: {e}")

        return list(discovered_map.values())

    @classmethod
    async def _discover_onvif(cls, timeout_seconds: float = 2.0) -> List[Dict[str, Any]]:
        cameras = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.settimeout(timeout_seconds)

        try:
            sock.sendto(cls.WS_DISCOVERY_PROBE.encode("utf-8"), ("239.255.255.250", 3702))
            loop = asyncio.get_running_loop()

            def receive_all():
                found = []
                while True:
                    try:
                        data, addr = sock.recvfrom(4096)
                        response_str = data.decode("utf-8", errors="ignore")
                        xaddrs_match = re.search(r"<d:XAddrs>(.*?)</d:XAddrs>", response_str)
                        ip = addr[0]
                        onvif_url = xaddrs_match.group(1).split()[0] if xaddrs_match else f"http://{ip}:80/onvif/device_service"

                        found.append({
                            "name": f"Câmera ONVIF ({ip})",
                            "ip": ip,
                            "port": 80,
                            "onvif_service_url": onvif_url,
                            "default_rtsp": f"rtsp://{ip}:554/stream1",
                            "type": "ONVIF Profile S",
                        })
                    except (socket.timeout, BlockingIOError):
                        break
                    except Exception:
                        break
                return found

            cameras = await loop.run_in_executor(None, receive_all)
        except Exception as e:
            logger.debug(f"ONVIF WS-Discovery exception: {e}")
        finally:
            sock.close()

        return cameras

    @classmethod
    async def _scan_subnet_rtsp(cls, timeout_per_host: float = 0.4) -> List[Dict[str, Any]]:
        """
        Asynchronously scans common RTSP ports (554, 8554) across the local /24 subnet.
        """
        local_ip = get_local_ip()
        if not local_ip or local_ip == "127.0.0.1":
            return []

        # Get subnet prefix (e.g. 192.168.1)
        parts = local_ip.split(".")
        if len(parts) != 4:
            return []
        subnet_prefix = ".".join(parts[:3])

        discovered: List[Dict[str, Any]] = []
        sem = asyncio.Semaphore(75) # 75 concurrent connections

        async def check_target(ip: str, port: int):
            async with sem:
                try:
                    conn = asyncio.open_connection(ip, port)
                    _, writer = await asyncio.wait_for(conn, timeout=timeout_per_host)
                    writer.close()
                    await writer.wait_closed()

                    discovered.append({
                        "name": f"Câmera IP ({ip}:{port})",
                        "ip": ip,
                        "port": port,
                        "default_rtsp": f"rtsp://{ip}:{port}/stream" if port == 8554 else f"rtsp://{ip}:{port}/h264Preview_01_main",
                        "type": "RTSP Stream IP",
                    })
                except Exception:
                    pass

        # Scan ports 554 and 8554 for IPs 1..254
        tasks = []
        for host_num in range(1, 255):
            target_ip = f"{subnet_prefix}.{host_num}"
            tasks.append(check_target(target_ip, 554))
            tasks.append(check_target(target_ip, 8554))

        await asyncio.gather(*tasks, return_exceptions=True)
        return discovered
