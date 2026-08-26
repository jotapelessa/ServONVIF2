"""
ServONVIF Tailscale Integration Service
Provides real-time detection of Tailscale mesh network, IP extraction (100.x.y.z),
MagicDNS hostnames, peer device discovery, and platform-specific installation scripts.
"""

import json
import os
import platform
import shutil
import socket
import subprocess
from typing import Any, Dict, List, Optional
from loguru import logger


class TailscaleService:
    """Detects and manages Tailscale WireGuard mesh status."""

    def __init__(self) -> None:
        self.os_type = platform.system().lower()

    def _find_tailscale_binary(self) -> Optional[str]:
        """Locates the Tailscale CLI binary across standard platform paths."""
        bin_in_path = shutil.which("tailscale")
        if bin_in_path:
            return bin_in_path

        candidates = []
        if self.os_type == "darwin":
            candidates = [
                "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
                "/opt/homebrew/bin/tailscale",
                "/usr/local/bin/tailscale",
                os.path.expanduser("~/Applications/Tailscale.app/Contents/MacOS/Tailscale"),
            ]
        elif self.os_type == "linux":
            candidates = [
                "/usr/bin/tailscale",
                "/usr/local/bin/tailscale",
                "/snap/bin/tailscale",
            ]
        elif self.os_type == "windows":
            candidates = [
                r"C:\Program Files\Tailscale\tailscale.exe",
                r"C:\Program Files (x86)\Tailscale\tailscale.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Tailscale\tailscale.exe"),
            ]

        for path in candidates:
            if os.path.exists(path):
                return path

        return None

    def _get_tailscale_ip_from_interfaces(self) -> Optional[str]:
        """Fallback: inspect network interfaces for 100.64.0.0/10 Carrier-Grade NAT (CGNAT) address."""
        try:
            # Check host addresses via socket getaddrinfo
            hostname = socket.gethostname()
            addresses = socket.gethostbyname_ex(hostname)[2]
            for addr in addresses:
                if self._is_cgnat_tailscale(addr):
                    return addr
        except Exception:
            pass

        # Try ifconfig / ip addr parsing
        try:
            if self.os_type in ("darwin", "linux"):
                cmd = ["ifconfig"] if self.os_type == "darwin" else ["ip", "addr"]
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1.5)
                for line in proc.stdout.splitlines():
                    if "inet " in line or "inet6 " in line:
                        parts = line.strip().split()
                        if len(parts) >= 2 and parts[0] == "inet":
                            ip = parts[1].split("/")[0]
                            if self._is_cgnat_tailscale(ip):
                                return ip
        except Exception:
            pass

        return None

    @staticmethod
    def _is_cgnat_tailscale(ip: str) -> bool:
        """Tailscale assigns IPs in the 100.64.0.0 to 100.127.255.255 range."""
        try:
            octets = [int(p) for p in ip.split(".")]
            if len(octets) == 4:
                return octets[0] == 100 and (64 <= octets[1] <= 127)
        except Exception:
            pass
        return False

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive Tailscale status."""
        binary = self._find_tailscale_binary()
        is_installed = binary is not None
        is_running = False
        tailscale_ip: Optional[str] = None
        magicdns_hostname: Optional[str] = None
        self_node_name: Optional[str] = None
        tailnet_name: Optional[str] = None
        peers: List[Dict[str, Any]] = []

        if binary:
            # 1. Try tailscale ip -4
            try:
                proc = subprocess.run(
                    [binary, "ip", "-4"],
                    capture_output=True,
                    text=True,
                    timeout=2.0,
                )
                if proc.returncode == 0:
                    ip = proc.stdout.strip()
                    if self._is_cgnat_tailscale(ip):
                        tailscale_ip = ip
                        is_running = True
            except Exception as e:
                logger.debug(f"Tailscale ip check: {e}")

            # 2. Try tailscale status --json
            try:
                proc = subprocess.run(
                    [binary, "status", "--json"],
                    capture_output=True,
                    text=True,
                    timeout=2.5,
                )
                if proc.returncode == 0 and proc.stdout.strip():
                    data = json.loads(proc.stdout)
                    self_node = data.get("Self", {})
                    if self_node:
                        is_running = True
                        self_node_name = self_node.get("HostName") or self_node.get("DNSName")
                        if self_node.get("TailscaleIPs"):
                            for ip in self_node["TailscaleIPs"]:
                                if "." in ip:  # IPv4
                                    tailscale_ip = ip
                                    break

                        dns_name = self_node.get("DNSName", "")
                        if dns_name:
                            magicdns_hostname = dns_name.rstrip(".")
                            # Extract tailnet domain (e.g. your-net.ts.net)
                            parts = magicdns_hostname.split(".", 1)
                            if len(parts) > 1:
                                tailnet_name = parts[1]

                    # Parse peers (other connected devices like TV, Mobile)
                    peers_dict = data.get("Peer", {})
                    for peer_key, peer_info in peers_dict.items():
                        peer_ips = peer_info.get("TailscaleIPs", [])
                        ipv4 = next((ip for ip in peer_ips if "." in ip), None)
                        peers.append({
                            "id": peer_info.get("ID"),
                            "hostname": peer_info.get("HostName"),
                            "dns_name": peer_info.get("DNSName", "").rstrip("."),
                            "ip": ipv4,
                            "os": peer_info.get("OS"),
                            "online": peer_info.get("Online", False),
                            "active": peer_info.get("Active", False),
                        })
            except Exception as e:
                logger.debug(f"Tailscale json status check: {e}")

        # Fallback interface inspection if binary was not detected or failed
        if not tailscale_ip:
            interface_ip = self._get_tailscale_ip_from_interfaces()
            if interface_ip:
                tailscale_ip = interface_ip
                is_running = True
                is_installed = True

        return {
            "is_installed": is_installed,
            "is_running": is_running,
            "binary_path": binary,
            "tailscale_ip": tailscale_ip,
            "magicdns_hostname": magicdns_hostname,
            "self_node_name": self_node_name,
            "tailnet_name": tailnet_name,
            "peers_count": len(peers),
            "peers": peers,
            "install_guide": self.get_install_guide(),
        }

    def get_install_guide(self) -> Dict[str, str]:
        """Provides easy copy-paste installation commands per platform."""
        return {
            "mac_brew": "brew install tailscale && sudo tailscale up",
            "mac_appstore": "https://apps.apple.com/app/tailscale/id1475387142",
            "linux_curl": "curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up",
            "windows_winget": "winget install Tailscale.Tailscale",
            "android_playstore": "https://play.google.com/store/apps/details?id=com.tailscale.ipn",
            "android_apk": "https://github.com/tailscale/tailscale-android/releases",
        }


# Singleton instance
tailscale_service = TailscaleService()
