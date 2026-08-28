import { Camera, MotionEvent, PlateLog, ConnectionConfig, PairingBundle } from "../types";
import { StorageService } from "./storage";
import { MobileLogger } from "./mobileLogger";

export class ApiService {
  private static cachedBaseUrl: string | null = null;
  private static activeRouteType: "LAN" | "TAILSCALE" = "LAN";

  public static async getActiveBaseUrl(): Promise<string> {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;

    const config = await StorageService.getConnectionConfig();
    if (!config) {
      MobileLogger.warn("API", "Nenhuma configuração de conexão encontrada no armazenamento local.");
      throw new Error("Servidor não configurado. Realize o login ou emparelhamento.");
    }

    MobileLogger.info("NETWORK", `Determinando rota ativa... LAN=${config.lan_url} | Tailscale=${config.tailscale_url || "N/A"}`);

    // Probe LAN first (fast timeout)
    const lanWorks = await this.probeUrl(config.lan_url, 1200);
    if (lanWorks) {
      this.cachedBaseUrl = config.lan_url;
      this.activeRouteType = "LAN";
      MobileLogger.info("NETWORK", `✅ Rota LAN conectada com sucesso: ${config.lan_url}`);
      return config.lan_url;
    }

    // Fallback to Tailscale HTTPS / IP
    if (config.tailscale_url) {
      const tsWorks = await this.probeUrl(config.tailscale_url, 3000);
      if (tsWorks) {
        this.cachedBaseUrl = config.tailscale_url;
        this.activeRouteType = "TAILSCALE";
        MobileLogger.info("NETWORK", `🌐 Rota Tailscale Mesh conectada: ${config.tailscale_url}`);
        return config.tailscale_url;
      }
    }

    // Default to configured base URL
    this.cachedBaseUrl = config.active_base_url || config.lan_url;
    MobileLogger.warn("NETWORK", `⚠️ Sondagens falharam. Usando URL fallback: ${this.cachedBaseUrl}`);
    return this.cachedBaseUrl;
  }

  public static getActiveRouteType(): "LAN" | "TAILSCALE" {
    return this.activeRouteType;
  }

  public static async refreshRoute(): Promise<string> {
    this.cachedBaseUrl = null;
    return await this.getActiveBaseUrl();
  }

  private static async probeUrl(url: string, timeoutMs: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${url}/api/auth/connection-info`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async pairDeviceWithBundle(
    bundle: PairingBundle,
    deviceName: string = "Meu Smartphone"
  ): Promise<ConnectionConfig> {
    // 1. Determine active reachability URL (LAN vs Tailscale)
    let workingBaseUrl = bundle.lan_url;
    const lanOk = await this.probeUrl(bundle.lan_url, 1500);
    if (!lanOk && bundle.tailscale_url) {
      workingBaseUrl = bundle.tailscale_url;
    }

    // 2. Submit token verification to backend
    const res = await fetch(`${workingBaseUrl}/api/auth/mobile-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: bundle.token,
        device_name: deviceName,
        device_type: "Smartphone",
        manufacturer_model: "Smartphone Móvel",
        app_version: "1.0.0",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha na validação do token.");

    const connConfig: ConnectionConfig = {
      lan_url: bundle.lan_url,
      tailscale_url: bundle.tailscale_url,
      session_token: data.session_token,
      server_name: bundle.server_name || "ServONVIF Hub",
      device_id: data.device.device_id,
      device_name: data.device.device_name,
      active_mode: "AUTO",
      active_base_url: workingBaseUrl,
      last_connected_at: new Date().toISOString(),
    };

    await StorageService.saveConnectionConfig(connConfig);
    this.cachedBaseUrl = workingBaseUrl;
    this.activeRouteType = workingBaseUrl.includes("192.168.") ? "LAN" : "TAILSCALE";

    return connConfig;
  }

  public static async getCameras(): Promise<Camera[]> {
    const baseUrl = await this.getActiveBaseUrl();
    const res = await fetch(`${baseUrl}/api/cameras/`);
    if (!res.ok) throw new Error("Falha ao carregar lista de câmeras.");
    const cams: Camera[] = await res.json();

    // Attach stream URLs dynamically based on active route
    return cams.map((cam) => ({
      ...cam,
      mjpeg_url: `${baseUrl}/api/stream/${cam.id}/live`,
      sub_stream_url: `${baseUrl}/api/stream/${cam.id}/live?quality=sub`,
    }));
  }

  public static async getPlateLogs(limit: number = 50): Promise<PlateLog[]> {
    const baseUrl = await this.getActiveBaseUrl();
    const res = await fetch(`${baseUrl}/api/vehicles/logs?limit=${limit}`);
    if (!res.ok) throw new Error("Falha ao carregar registros de placas.");
    return res.json();
  }

  public static async getRecentEvents(limit: number = 30): Promise<MotionEvent[]> {
    const baseUrl = await this.getActiveBaseUrl();
    const res = await fetch(`${baseUrl}/api/events/?limit=${limit}`);
    if (!res.ok) throw new Error("Falha ao carregar eventos de movimento.");
    return res.json();
  }

  public static async sendDevicePing(): Promise<any> {
    const config = await StorageService.getConnectionConfig();
    if (!config) return null;
    const baseUrl = await this.getActiveBaseUrl();
    const res = await fetch(`${baseUrl}/api/devices/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: config.device_id,
        device_name: config.device_name,
        device_type: "Smartphone",
        manufacturer_model: "Smartphone App",
      }),
    });
    return res.json();
  }
}
