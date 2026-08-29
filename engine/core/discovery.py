import asyncio
import socket
import re
import concurrent.futures
from typing import List, Dict, Any, Optional
import urllib.request
from loguru import logger
from engine.api.routes_settings import get_local_ip

class ONVIFDiscovery:
    """
    High-Speed Resilient Multi-Engine Camera Discovery:
    1. WS-Discovery (UDP Multicast on 239.255.255.250:3702, 255.255.255.255:3702, and Subnet Broadcasts).
    2. Parallel Subnet Scanner across all detected LAN subnets.
    3. Smartphone IP Camera Simulator Support (IP Webcam, DroidCam, RTSP Camera on Android/Xiaomi).
    4. Direct IP / Custom Range Probing with auto-detection of HTTP MJPEG and RTSP streams.
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

    PRIORITY_CAMERA_PORTS = [554, 8554, 8080, 8081, 4747, 8000, 8888, 8899, 37777, 34567, 1935, 80]

    @classmethod
    async def discover_cameras(
        cls,
        timeout_seconds: float = 6.0,
        custom_ip: Optional[str] = None,
        custom_subnet: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs ONVIF WS-Discovery and concurrent Subnet/IP Port Scan.
        """
        discovered_map: Dict[str, Dict[str, Any]] = {}

        # 0. Discovery initialization log
        if custom_ip and custom_ip.strip():
            ip_clean = custom_ip.strip()
            logger.info(f"[Varredura de Câmeras] 🎯 Sondando diretamente o endereço IP alvo: {ip_clean}...")
            direct_cam = await cls._probe_single_ip(ip_clean)
            if direct_cam:
                discovered_map[ip_clean] = direct_cam
                logger.success(f"[Varredura de Câmeras] ✅ Câmera encontrada no IP {ip_clean}! URL: {direct_cam['default_rtsp']} ({direct_cam['type']})")
            else:
                logger.warning(f"[Varredura de Câmeras] ⚠️ Nenhuma câmera ativa respondeu no IP {ip_clean}")
        else:
            logger.info(f"[Varredura de Câmeras] 🔍 Iniciando varredura ampla na rede local (Portas ONVIF, RTSP e Smartphone)...")

        # 1. Run ONVIF WS-Discovery concurrently
        onvif_task = asyncio.create_task(cls._discover_onvif(timeout_seconds=2.0))
        # 2. Run High-Speed Subnet Port Scan concurrently
        scan_task = asyncio.create_task(cls._scan_subnet_fast(timeout_per_host=0.35, target_subnet=custom_subnet))

        try:
            onvif_results, port_results = await asyncio.gather(onvif_task, scan_task, return_exceptions=True)

            if isinstance(onvif_results, list):
                for cam in onvif_results:
                    discovered_map[cam["ip"]] = cam
                    logger.success(f"[Varredura de Câmeras] ✅ Câmera ONVIF descoberta: {cam['ip']} ({cam['onvif_service_url']})")

            if isinstance(port_results, list):
                for cam in port_results:
                    if cam["ip"] not in discovered_map:
                        discovered_map[cam["ip"]] = cam
                        logger.success(f"[Varredura de Câmeras] ✅ Câmera IP descoberta: {cam['name']} ({cam['ip']}:{cam['port']}) -> {cam['default_rtsp']}")
        except Exception as e:
            logger.warning(f"[Varredura de Câmeras] Aviso de agregação: {e}")

        total_found = len(discovered_map)
        if total_found > 0:
            logger.info(f"[Varredura de Câmeras] 🏁 Varredura concluída com sucesso! Total de câmeras detectadas: {total_found}")
        else:
            logger.warning(f"[Varredura de Câmeras] ⚠️ Varredura concluída. Nenhuma câmera foi encontrada na rede local.")

        return list(discovered_map.values())

    @classmethod
    async def _probe_single_ip(cls, ip: str) -> Optional[Dict[str, Any]]:
        """Directly probes a single IP across all camera and smartphone simulator ports."""
        loop = asyncio.get_running_loop()

        def do_probe():
            # 1. Test dedicated RTSP / ONVIF ports FIRST (8554, 554, 1935, 8000, 37777, 34567, 80)
            for port in [8554, 554, 1935, 8000, 8899, 37777, 34567, 80]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.4)
                    res = s.connect_ex((ip, port))
                    s.close()
                    if res == 0:
                        if port == 8554:
                            stream_path = "/stream"
                        elif port == 554:
                            stream_path = "/live/0/MAIN"
                        elif port == 1935:
                            return {
                                "name": f"Câmera RTSP ({ip})",
                                "ip": ip,
                                "port": port,
                                "default_rtsp": f"rtsp://admin:admin@{ip}:1935/live",
                                "type": "Vídeo RTSP (1935)",
                            }
                        else:
                            stream_path = "/stream1"
                        return {
                            "name": f"Xiaomi / Câmera IP ({ip})",
                            "ip": ip,
                            "port": port,
                            "onvif_service_url": f"http://{ip}:80/onvif/device_service",
                            "default_rtsp": f"rtsp://{ip}:{port}{stream_path}",
                            "type": "ONVIF / RTSP Direto",
                        }
                except Exception:
                    pass

            # 2. Test Smartphone HTTP Webcam ports (8080, 8081, 4747, 8888) as fallback
            for http_port in [8080, 8081, 4747, 8888]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(0.4)
                    if s.connect_ex((ip, http_port)) == 0:
                        s.close()
                        if http_port == 4747:
                            return {
                                "name": f"Smartphone DroidCam ({ip})",
                                "ip": ip,
                                "port": http_port,
                                "default_rtsp": f"http://{ip}:{http_port}/video",
                                "type": "DroidCam MJPEG",
                            }
                        return {
                            "name": f"Smartphone IP Camera ({ip})",
                            "ip": ip,
                            "port": http_port,
                            "default_rtsp": f"http://{ip}:{http_port}/video",
                            "type": "Câmera Celular (IP Webcam / MJPEG)",
                        }
                    s.close()
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
        Scans entire /24 subnets in parallel across CCTV, ONVIF and Smartphone Simulator camera ports.
        """
        subnets_to_scan = []
        if target_subnet and target_subnet.strip():
            clean_sub = target_subnet.strip().rstrip(".0/24").rstrip(".0")
            parts = clean_sub.split(".")
            if len(parts) >= 3:
                subnets_to_scan.append(".".join(parts[:3]))

        local_ip = get_local_ip()
        if not subnets_to_scan:
            parts = local_ip.split(".")
            main_subnet = ".".join(parts[:3]) if len(parts) == 4 else "192.168.1"
            subnets_to_scan.append(main_subnet)

        def test_host(target_ip: str) -> Optional[Dict[str, Any]]:
            # Ignore self machine
            if target_ip == local_ip or target_ip == "127.0.0.1":
                return None

            # 1. Check dedicated video stream ports FIRST (8554, 554, 1935, 37777, 34567, 8000)
            for rtsp_port in [8554, 554, 1935, 37777, 34567, 8000]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(timeout_per_host)
                    res = s.connect_ex((target_ip, rtsp_port))
                    s.close()
                    if res == 0:
                        if rtsp_port == 8554:
                            stream_path = "/stream"
                        elif rtsp_port == 554:
                            stream_path = "/live/0/MAIN"
                        elif rtsp_port == 1935:
                            return {
                                "name": f"Câmera RTSP ({target_ip})",
                                "ip": target_ip,
                                "port": rtsp_port,
                                "default_rtsp": f"rtsp://admin:admin@{target_ip}:1935/live",
                                "type": "Vídeo RTSP (1935)",
                            }
                        else:
                            stream_path = "/stream1"
                        return {
                            "name": f"Xiaomi / Câmera IP ({target_ip})",
                            "ip": target_ip,
                            "port": rtsp_port,
                            "default_rtsp": f"rtsp://{target_ip}:{rtsp_port}{stream_path}",
                            "type": f"Vídeo RTSP ({rtsp_port})",
                        }
                except Exception:
                    pass

            # 2. Check Smartphone IP Webcam / Simulator ports (8080, 8081, 4747, 8888)
            for phone_port in [8080, 8081, 4747, 8888]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(timeout_per_host)
                    res = s.connect_ex((target_ip, phone_port))
                    s.close()
                    if res == 0:
                        if phone_port == 4747:
                            return {
                                "name": f"Smartphone DroidCam ({target_ip})",
                                "ip": target_ip,
                                "port": phone_port,
                                "default_rtsp": f"http://{target_ip}:{phone_port}/video",
                                "type": "DroidCam MJPEG",
                            }
                        return {
                            "name": f"Smartphone IP Camera ({target_ip})",
                            "ip": target_ip,
                            "port": phone_port,
                            "default_rtsp": f"http://{target_ip}:{phone_port}/video",
                            "type": "Câmera Celular (IP Webcam / MJPEG)",
                        }
                except Exception:
                    pass

            # 3. Port 80 (HTTP ONVIF check)
            if not target_ip.endswith(".1"):
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(timeout_per_host)
                    res = s.connect_ex((target_ip, 80))
                    s.close()
                    if res == 0:
                        s_rtsp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        s_rtsp.settimeout(0.3)
                        rtsp_res = s_rtsp.connect_ex((target_ip, 554))
                        s_rtsp.close()
                        if rtsp_res == 0:
                            return {
                                "name": f"Câmera ONVIF ({target_ip})",
                                "ip": target_ip,
                                "port": 80,
                                "default_rtsp": f"rtsp://{target_ip}:554/live/0/MAIN",
                                "type": "ONVIF Profile S",
                            }
                except Exception:
                    pass

            return None

        loop = asyncio.get_running_loop()
        
        def run_thread_pool():
            results = []
            targets = [
                f"{sub_prefix}.{host_num}"
                for sub_prefix in subnets_to_scan
                for host_num in range(2, 255)
            ]
            with concurrent.futures.ThreadPoolExecutor(max_workers=120) as executor:
                futures = [executor.submit(test_host, ip) for ip in targets]
                for future in concurrent.futures.as_completed(futures):
                    res = future.result()
                    if res is not None:
                        results.append(res)
            return results

        return await loop.run_in_executor(None, run_thread_pool)
