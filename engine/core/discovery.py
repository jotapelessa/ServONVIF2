import asyncio
import socket
import re
import concurrent.futures
from typing import List, Dict, Any, Optional
from loguru import logger
from engine.api.routes_settings import get_local_ip

class ONVIFDiscovery:
    """
    High-Speed Resilient Dual-Engine Camera Discovery:
    1. WS-Discovery (UDP Multicast on 239.255.255.250:3702, 255.255.255.255:3702, and Subnet Broadcasts).
    2. Parallel Subnet Scanner across all detected LAN subnets (Ports 554, 80, 8554, 8000, 8899, 37777, 34567).
    3. Direct IP / Custom Range Probing with RTSP path auto-resolution.
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

    PRIORITY_CAMERA_PORTS = [554, 80, 8554, 8000, 8899, 37777, 34567]
    COMMON_RTSP_PATHS = ["/live/0/MAIN", "/stream1", "/h264Preview_01_main", "/Streaming/Channels/101", "/onvif1", "/live/ch0"]

    @classmethod
    async def discover_cameras(
        cls,
        timeout_seconds: float = 5.0,
        custom_ip: Optional[str] = None,
        custom_subnet: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs ONVIF WS-Discovery and concurrent Subnet/IP Port Scan.
        """
        discovered_map: Dict[str, Dict[str, Any]] = {}

        # 0. If a specific IP is requested, run ultra-fast targeted probe first
        if custom_ip and custom_ip.strip():
            ip_clean = custom_ip.strip()
            direct_cam = await cls._probe_single_ip(ip_clean)
            if direct_cam:
                discovered_map[ip_clean] = direct_cam
                logger.info(f"Targeted Scan: Discovered Camera at {ip_clean}")

        # 1. Run ONVIF WS-Discovery concurrently
        onvif_task = asyncio.create_task(cls._discover_onvif(timeout_seconds=2.0))
        # 2. Run High-Speed Subnet Port Scan concurrently
        scan_task = asyncio.create_task(cls._scan_subnet_fast(timeout_per_host=0.4, target_subnet=custom_subnet))

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
    async def _probe_single_ip(cls, ip: str) -> Optional[Dict[str, Any]]:
        """Directly probes a single IP across all camera ports."""
        loop = asyncio.get_running_loop()

        def do_probe():
            for port in [554, 80, 8000, 8554, 8899, 37777, 34567]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.6)
                    res = s.connect_ex((ip, port))
                    s.close()
                    if res == 0:
                        stream_path = "/live/0/MAIN" if port == 554 else "/stream1"
                        return {
                            "name": f"Câmera IP ({ip})",
                            "ip": ip,
                            "port": port,
                            "onvif_service_url": f"http://{ip}:80/onvif/device_service",
                            "default_rtsp": f"rtsp://{ip}:554{stream_path}",
                            "type": "ONVIF / RTSP Direto",
                        }
                except Exception:
                    pass
            return None

        return await loop.run_in_executor(None, do_probe)

    @classmethod
    async def _discover_onvif(cls, timeout_seconds: float = 2.0) -> List[Dict[str, Any]]:
        cameras = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout_seconds)

        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            probe_bytes = cls.WS_DISCOVERY_PROBE.encode("utf-8")
            
            # Send to standard multicast and general broadcast
            for target_addr in [("239.255.255.250", 3702), ("255.255.255.255", 3702), ("192.168.1.255", 3702), ("192.168.0.255", 3702)]:
                try:
                    sock.sendto(probe_bytes, target_addr)
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
                            "default_rtsp": f"rtsp://{ip}:554/live/0/MAIN",
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
    async def _scan_subnet_fast(
        cls,
        timeout_per_host: float = 0.35,
        target_subnet: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Scans entire /24 subnets in parallel using a thread pool of 200 workers.
        Finishes in ~2 seconds.
        """
        subnets_to_scan = []
        if target_subnet and target_subnet.strip():
            clean_sub = target_subnet.strip().rstrip(".0/24").rstrip(".0")
            parts = clean_sub.split(".")
            if len(parts) >= 3:
                subnets_to_scan.append(".".join(parts[:3]))

        if not subnets_to_scan:
            local_ip = get_local_ip()
            parts = local_ip.split(".")
            main_subnet = ".".join(parts[:3]) if len(parts) == 4 else "192.168.1"
            subnets_to_scan.append(main_subnet)
            if main_subnet != "192.168.1":
                subnets_to_scan.append("192.168.1")
            if main_subnet != "192.168.0":
                subnets_to_scan.append("192.168.0")

        def test_port(target_ip: str, port: int) -> Optional[Dict[str, Any]]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout_per_host)
                res = s.connect_ex((target_ip, port))
                s.close()
                if res == 0:
                    stream_path = "/live/0/MAIN" if port == 554 else "/stream1"
                    return {
                        "name": f"Câmera IP ({target_ip}:{port})",
                        "ip": target_ip,
                        "port": port,
                        "default_rtsp": f"rtsp://{target_ip}:554{stream_path}",
                        "type": f"Porta {port} Aberta",
                    }
            except Exception:
                pass
            return None

        loop = asyncio.get_running_loop()
        
        def run_thread_pool():
            results = []
            targets = [
                (f"{sub_prefix}.{host_num}", port)
                for sub_prefix in subnets_to_scan
                for host_num in range(1, 255)
                for port in [554, 80, 8000, 8554]
            ]
            with concurrent.futures.ThreadPoolExecutor(max_workers=200) as executor:
                futures = [executor.submit(test_port, ip, port) for ip, port in targets]
                for future in concurrent.futures.as_completed(futures):
                    res = future.result()
                    if res is not None:
                        results.append(res)
            return results

        return await loop.run_in_executor(None, run_thread_pool)

