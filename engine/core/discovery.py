import asyncio
import socket
import re
from typing import List, Dict, Any
from loguru import logger
from engine.api.routes_settings import get_local_ip

class ONVIFDiscovery:
    """
    Dual-engine camera discovery:
    1. WS-Discovery (UDP Multicast on 239.255.255.250:3702 and Broadcast 255.255.255.255:3702) for standard ONVIF devices.
    2. High-speed concurrent Multi-Port Scanner (554, 8554, 8000, 80, 8899, 37777, 34567) across all local subnet hosts.
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

    COMMON_CAMERA_PORTS = [554, 8554, 8000, 8899, 37777, 34567]

    @classmethod
    async def discover_cameras(cls, timeout_seconds: float = 3.5) -> List[Dict[str, Any]]:
        """
        Runs both ONVIF WS-Discovery and concurrent Subnet RTSP/ONVIF Multi-Port Scan.
        """
        discovered_map: Dict[str, Dict[str, Any]] = {}

        # 1. Run ONVIF WS-Discovery
        try:
            onvif_results = await cls._discover_onvif(timeout_seconds=timeout_seconds)
            for cam in onvif_results:
                discovered_map[cam["ip"]] = cam
                logger.info(f"Discovered ONVIF Camera: {cam['ip']}")
        except Exception as e:
            logger.warning(f"ONVIF WS-Discovery encountered error: {e}")

        # 2. Run High-Speed Multi-Port Subnet Scan
        try:
            port_results = await cls._scan_subnet_ports(timeout_per_host=0.5)
            for cam in port_results:
                if cam["ip"] not in discovered_map:
                    discovered_map[cam["ip"]] = cam
                    logger.info(f"Discovered IP Camera via Port Scan: {cam['ip']}:{cam['port']}")
        except Exception as e:
            logger.warning(f"Subnet Port Scan encountered error: {e}")

        return list(discovered_map.values())

    @classmethod
    async def _discover_onvif(cls, timeout_seconds: float = 2.5) -> List[Dict[str, Any]]:
        cameras = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.settimeout(timeout_seconds)

        try:
            # Send to Multicast and Broadcast addresses
            probe_bytes = cls.WS_DISCOVERY_PROBE.encode("utf-8")
            sock.sendto(probe_bytes, ("239.255.255.250", 3702))
            sock.sendto(probe_bytes, ("255.255.255.255", 3702))

            loop = asyncio.get_running_loop()

            def receive_all():
                found = []
                seen_ips = set()
                while True:
                    try:
                        data, addr = sock.recvfrom(4096)
                        ip = addr[0]
                        if ip in seen_ips:
                            continue
                        seen_ips.add(ip)

                        response_str = data.decode("utf-8", errors="ignore")
                        xaddrs_match = re.search(r"<d:XAddrs>(.*?)</d:XAddrs>", response_str)
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
    async def _scan_subnet_ports(cls, timeout_per_host: float = 0.5) -> List[Dict[str, Any]]:
        """
        Asynchronously scans common IP Camera ports across the entire local /24 subnet.
        """
        local_ip = get_local_ip()
        parts = local_ip.split(".")
        if len(parts) != 4:
            subnet_prefix = "192.168.1"
        else:
            subnet_prefix = ".".join(parts[:3])

        discovered: List[Dict[str, Any]] = []
        sem = asyncio.Semaphore(80) # 80 concurrent connections

        async def check_target(ip: str, port: int):
            async with sem:
                try:
                    conn = asyncio.open_connection(ip, port)
                    _, writer = await asyncio.wait_for(conn, timeout=timeout_per_host)
                    writer.close()
                    await writer.wait_closed()

                    stream_path = "/stream" if port == 8554 else "/h264Preview_01_main"
                    discovered.append({
                        "name": f"Câmera IP ({ip}:{port})",
                        "ip": ip,
                        "port": port,
                        "default_rtsp": f"rtsp://{ip}:{port}{stream_path}",
                        "type": f"Porta {port} Aberta",
                    })
                except Exception:
                    pass

        # Scan each host in subnet for all common camera ports
        tasks = []
        for host_num in range(1, 255):
            target_ip = f"{subnet_prefix}.{host_num}"
            for port in cls.COMMON_CAMERA_PORTS:
                tasks.append(check_target(target_ip, port))

        await asyncio.gather(*tasks, return_exceptions=True)
        return discovered
