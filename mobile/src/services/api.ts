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
      throw new Error("Servidor não configurado. Realize o emparelhamento ou login.");
    }

    MobileLogger.info("NETWORK", `Determinando rota ativa... LAN=${config.lan_url} | Tailscale=${config.tailscale_url || "N/A"}`);

    // Probe LAN first (fast timeout)
    const lanWorks = await this.probeUrl(config.lan_url, 1500);
    if (lanWorks) {
      this.cachedBaseUrl = config.lan_url;
      this.activeRouteType = "LAN";
      MobileLogger.info("NETWORK", `✅ Rota LAN ativa: ${config.lan_url}`);
      return config.lan_url;
    }

    // Fallback to Tailscale HTTPS / IP
    if (config.tailscale_url) {
      const tsWorks = await this.probeUrl(config.tailscale_url, 3000);
      if (tsWorks) {
        this.cachedBaseUrl = config.tailscale_url;
        this.activeRouteType = "TAILSCALE";
        MobileLogger.info("NETWORK", `🌐 Rota Tailscale Mesh ativa: ${config.tailscale_url}`);
        return config.tailscale_url;
      }
    }

    // Default to configured base URL
    this.cachedBaseUrl = config.active_base_url || config.lan_url;
    MobileLogger.warn("NETWORK", `⚠️ Sondagens falharam. Usando URL direta: ${this.cachedBaseUrl}`);
    return this.cachedBaseUrl;
  }

  public static getActiveRouteType(): "LAN" | "TAILSCALE" {
    return this.activeRouteType;
  }

  public static async refreshRoute(): Promise<string> {
    this.cachedBaseUrl = null;
    return await this.getActiveBaseUrl();
  }

  private static sanitizeUrl(rawUrl: string): string {
    let clean = rawUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `http://${clean}`;
    }
    // If no port specified and not a standard domain, default to :8080
    const parts = clean.split("/");
    const hostPort = parts[2] || "";
    if (!hostPort.includes(":") && !hostPort.includes(".ts.net")) {
      clean = `${parts[0]}//${hostPort}:8080`;
    }
    return clean;
  }

  public static async probeUrl(url: string, timeoutMs: number = 2000): Promise<boolean> {
    if (!url) return false;
    const sanitized = this.sanitizeUrl(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${sanitized}/api/auth/connection-info`, {
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
    const rawLan = this.sanitizeUrl(bundle.lan_url || "http://192.168.1.96:8080");
    const rawTs = bundle.tailscale_url ? this.sanitizeUrl(bundle.tailscale_url) : undefined;

    MobileLogger.info("AUTH", `Iniciando validação de emparelhamento... LAN=${rawLan} | TS=${rawTs || "N/A"}`);

    // Determine active URL
    let workingBaseUrl = rawLan;
    const lanOk = await this.probeUrl(rawLan, 2000);
    if (!lanOk && rawTs) {
      const tsOk = await this.probeUrl(rawTs, 3500);
      if (tsOk) {
        workingBaseUrl = rawTs;
      }
    }

    MobileLogger.info("AUTH", `Enviando credenciais para ${workingBaseUrl}/api/auth/mobile-verify`);

    try {
      const res = await fetch(`${workingBaseUrl}/api/auth/mobile-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: bundle.token,
          device_name: deviceName,
          device_type: "Smartphone",
          manufacturer_model: "Smartphone Móvel",
          app_version: "002.002.131",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || `Erro HTTP ${res.status} ao validar token com o servidor.`;
        MobileLogger.error("AUTH", msg);
        throw new Error(msg);
      }

      const data = await res.json();
      const connConfig: ConnectionConfig = {
        lan_url: rawLan,
        tailscale_url: rawTs,
        session_token: data.session_token || "session_active",
        server_name: bundle.server_name || "ServONVIF Hub",
        device_id: data.device?.device_id || `DEV-PHONE-${Date.now().toString(16)}`,
        device_name: data.device?.device_name || deviceName,
        active_mode: "AUTO",
        active_base_url: workingBaseUrl,
        last_connected_at: new Date().toISOString(),
      };

      await StorageService.saveConnectionConfig(connConfig);
      this.cachedBaseUrl = workingBaseUrl;
      this.activeRouteType = workingBaseUrl.includes("192.168.") ? "LAN" : "TAILSCALE";

      MobileLogger.info("AUTH", `✅ Dispositivo registrado com sucesso! ID: ${connConfig.device_id}`);
      return connConfig;
    } catch (e: any) {
      MobileLogger.error("AUTH", `Exceção na validação: ${e.message}`, e);
      throw new Error(`Não foi possível conectar ao servidor (${workingBaseUrl}): ${e.message}`);
    }
  }

  public static async getCameras(): Promise<Camera[]> {
    try {
      const baseUrl = await this.getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/api/cameras/`);
      if (!res.ok) throw new Error(`Status ${res.status} ao buscar câmeras`);
      const cams: Camera[] = await res.json();

      return cams.map((cam) => ({
        ...cam,
        mjpeg_url: `${baseUrl}/api/stream/${cam.id}/live`,
        sub_stream_url: `${baseUrl}/api/stream/${cam.id}/live?quality=sub`,
      }));
    } catch (e: any) {
      MobileLogger.error("CAMERAS", `Erro ao listar câmeras: ${e.message}`, e);
      throw e;
    }
  }

  public static async getPlateLogs(limit: number = 50): Promise<PlateLog[]> {
    try {
      const baseUrl = await this.getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/api/vehicles/logs?limit=${limit}`);
      if (!res.ok) throw new Error(`Status ${res.status} ao buscar placas`);
      return await res.json();
    } catch (e: any) {
      MobileLogger.error("PLATES", `Erro ao carregar placas: ${e.message}`, e);
      throw e;
    }
  }

  public static async getRecentEvents(limit: number = 30): Promise<MotionEvent[]> {
    try {
      const baseUrl = await this.getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/api/events/?limit=${limit}`);
      if (!res.ok) throw new Error(`Status ${res.status} ao buscar eventos`);
      return await res.json();
    } catch (e: any) {
      MobileLogger.error("EVENTS", `Erro ao carregar eventos: ${e.message}`, e);
      throw e;
    }
  }

  public static async sendDevicePing(): Promise<any> {
    try {
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
      return await res.json();
    } catch (e: any) {
      MobileLogger.warn("PING", `Falha no ping do dispositivo: ${e.message}`);
      return null;
    }
  }
}
