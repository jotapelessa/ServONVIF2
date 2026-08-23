import asyncio
import socket
import re
import concurrent.futures
from typing import List, Dict, Any
from loguru import logger
from engine.api.routes_settings import get_local_ip

class ONVIFDiscovery:
    """
    High-Speed Dual-Engine camera discovery:
    1. WS-Discovery (UDP Multicast on 239.255.255.250:3702).
    2. Ultra-Fast Multi-Threaded Subnet Scanner (554, 8554, 8000, 8899, 37777, 34567) completed in < 3 seconds.
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

    PRIORITY_CAMERA_PORTS = [554, 8554, 8000, 8899, 37777, 34567]

    @classmethod
    async def discover_cameras(cls, timeout_seconds: float = 6.0) -> List[Dict[str, Any]]:
        """
        Runs both ONVIF WS-Discovery and concurrent Subnet Port Scan.
        """
        discovered_map: Dict[str, Dict[str, Any]] = {}

        # 1. Run ONVIF WS-Discovery concurrently
        onvif_task = asyncio.create_task(cls._discover_onvif(timeout_seconds=1.5))
        # 2. Run High-Speed Subnet Port Scan concurrently
        scan_task = asyncio.create_task(cls._scan_subnet_fast(timeout_per_host=0.4))

        try:
            onvif_results, port_results = await asyncio.gather(onvif_task, scan_task, return_exceptions=True)

            if isinstance(onvif_results, list):
                for cam in onvif_results:
                    discovered_map[cam["ip"]] = cam
                    logger.info(f"Discovered ONVIF Camera: {cam['ip']}")

            if isinstance(port_results, list):
                for cam in port_results:
                    if cam["ip"] not in discovered_map:
                        discovered_map[cam["ip"]] = cam
                        logger.info(f"Discovered IP Camera via Port Scan: {cam['ip']}:{cam['port']}")
        except Exception as e:
            logger.warning(f"Discovery aggregation notice: {e}")

        return list(discovered_map.values())

    @classmethod
    async def _discover_onvif(cls, timeout_seconds: float = 1.5) -> List[Dict[str, Any]]:
        cameras = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout_seconds)

        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            probe_bytes = cls.WS_DISCOVERY_PROBE.encode("utf-8")
            
            try:
                sock.sendto(probe_bytes, ("239.255.255.250", 3702))
            except Exception:
                pass

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
                    except Exception:
                        break
                return found

            cameras = await loop.run_in_executor(None, receive_all)
        except Exception:
            pass
        finally:
            sock.close()

        return cameras

    @classmethod
    async def _scan_subnet_fast(cls, timeout_per_host: float = 0.4) -> List[Dict[str, Any]]:
        """
        Scans entire /24 subnet across camera ports in parallel using a thread pool of 200 workers.
        Finishes in ~2 seconds.
        """
        local_ip = get_local_ip()
        parts = local_ip.split(".")
        subnet_prefix = ".".join(parts[:3]) if len(parts) == 4 else "192.168.1"

        def test_port(target_ip: str, port: int) -> Optional[Dict[str, Any]]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout_per_host)
                res = s.connect_ex((target_ip, port))
                s.close()
                if res == 0:
                    stream_path = "/stream" if port == 8554 else "/h264Preview_01_main"
                    return {
                        "name": f"Câmera IP ({target_ip}:{port})",
                        "ip": target_ip,
                        "port": port,
                        "default_rtsp": f"rtsp://{target_ip}:{port}{stream_path}",
                        "type": f"Porta {port} Aberta",
                    }
            except Exception:
                pass
            return None

        loop = asyncio.get_running_loop()
        
        def run_thread_pool():
            results = []
            targets = [
                (f"{subnet_prefix}.{host_num}", port)
                for host_num in range(1, 255)
                for port in cls.PRIORITY_CAMERA_PORTS
            ]
            with concurrent.futures.ThreadPoolExecutor(max_workers=200) as executor:
                futures = [executor.submit(test_port, ip, port) for ip, port in targets]
                for future in concurrent.futures.as_completed(futures):
                    res = future.result()
                    if res is not None:
                        results.append(res)
            return results

        return await loop.run_in_executor(None, run_thread_pool)
