import { Camera, MotionEvent, PlateLog, ConnectionConfig, PairingBundle } from "../types";
import { StorageService } from "./storage";
import { MobileLogger } from "./mobileLogger";

export class ApiService {
  private static cachedBaseUrl: string | null = null;
  private static activeRouteType: "LAN" | "TAILSCALE" = "TAILSCALE";

  public static async getActiveBaseUrl(): Promise<string> {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;

    const config = await StorageService.getConnectionConfig();
    if (!config) {
      MobileLogger.warn("API", "Nenhuma configuração de conexão encontrada no armazenamento local.");
      throw new Error("Servidor não configurado. Realize o emparelhamento ou login.");
    }

    const mode = config.active_mode || "TAILSCALE";
    MobileLogger.info("NETWORK", `Determinando rota ativa [Modo: ${mode}]... Tailscale=${config.tailscale_url || "N/A"} | LAN=${config.lan_url}`);

    // 1. Force Tailscale Mode (Primary Default)
    if (mode === "TAILSCALE" && config.tailscale_url) {
      const tsWorks = await this.probeUrl(config.tailscale_url, 3000);
      if (tsWorks) {
        this.cachedBaseUrl = this.sanitizeUrl(config.tailscale_url);
        this.activeRouteType = "TAILSCALE";
        MobileLogger.info("NETWORK", `🌐 Rota Tailscale Mesh (Padrão) conectada com sucesso: ${this.cachedBaseUrl}`);
        return this.cachedBaseUrl;
      }
      // If forced Tailscale is temporarily unreachable, fallback to LAN with log
      MobileLogger.warn("NETWORK", `⚠️ Rota Tailscale inacessível (Verifique se o app Tailscale está ATIVO no celular). Failover para LAN...`);
      const lanWorks = await this.probeUrl(config.lan_url, 1500);
      if (lanWorks) {
        this.cachedBaseUrl = this.sanitizeUrl(config.lan_url);
        this.activeRouteType = "LAN";
        MobileLogger.info("NETWORK", `📶 Failover para LAN Wi-Fi ativado: ${this.cachedBaseUrl}`);
        return this.cachedBaseUrl;
      }
    }

    // 2. Force LAN Mode
    if (mode === "LAN") {
      this.cachedBaseUrl = this.sanitizeUrl(config.lan_url);
      this.activeRouteType = "LAN";
      MobileLogger.info("NETWORK", `📶 Modo Forçado LAN ativo: ${this.cachedBaseUrl}`);
      return this.cachedBaseUrl;
    }

    // 3. AUTO Mode: Probe Tailscale FIRST (Works everywhere seamlessly, on Wi-Fi and 4G/5G)
    if (config.tailscale_url) {
      const tsWorks = await this.probeUrl(config.tailscale_url, 3000);
      if (tsWorks) {
        this.cachedBaseUrl = this.sanitizeUrl(config.tailscale_url);
        this.activeRouteType = "TAILSCALE";
        MobileLogger.info("NETWORK", `🌐 [AUTO] Rota Tailscale Mesh ativa: ${this.cachedBaseUrl}`);
        return this.cachedBaseUrl;
      }
    }

    // Fallback to local LAN Wi-Fi
    const lanWorks = await this.probeUrl(config.lan_url, 1500);
    if (lanWorks) {
      this.cachedBaseUrl = this.sanitizeUrl(config.lan_url);
      this.activeRouteType = "LAN";
      MobileLogger.info("NETWORK", `📶 [AUTO] Rota LAN Wi-Fi conectada: ${this.cachedBaseUrl}`);
      return this.cachedBaseUrl;
    }

    // Default fallback
    this.cachedBaseUrl = this.sanitizeUrl(config.tailscale_url || config.active_base_url || config.lan_url);
    this.activeRouteType = (this.cachedBaseUrl && (this.cachedBaseUrl.includes(".ts.net") || this.cachedBaseUrl.includes("100."))) ? "TAILSCALE" : "LAN";
    MobileLogger.warn("NETWORK", `⚠️ Sondagens falharam. Usando URL direta: ${this.cachedBaseUrl}`);
    return this.cachedBaseUrl;
  }

  public static getActiveRouteType(): "LAN" | "TAILSCALE" {
    return this.activeRouteType;
  }

  public static async setRouteMode(mode: "AUTO" | "LAN" | "TAILSCALE"): Promise<void> {
    const config = await StorageService.getConnectionConfig();
    if (!config) return;
    config.active_mode = mode;
    await StorageService.saveConnectionConfig(config);
    this.cachedBaseUrl = null;
    MobileLogger.info("NETWORK", `Modo de conexão alterado para: ${mode}`);
    await this.getActiveBaseUrl();
  }

  public static async refreshRoute(): Promise<string> {
    this.cachedBaseUrl = null;
    return await this.getActiveBaseUrl();
  }

  public static sanitizeUrl(rawUrl: string): string {
    let clean = rawUrl.trim();
    // Convert https:// to http:// if port 8080 is specified (Uvicorn HTTP)
    if (clean.includes(":8080") && clean.startsWith("https://")) {
      clean = clean.replace("https://", "http://");
    }
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `http://${clean}`;
    }
    const parts = clean.split("/");
    const hostPort = parts[2] || "";
    if (!hostPort.includes(":") && !hostPort.includes(".ts.net")) {
      clean = `${parts[0]}//${hostPort}:8080`;
    }
    return clean;
  }

  public static async probeUrl(url: string, timeoutMs: number = 2500): Promise<boolean> {
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
      // Try HTTP alternative if HTTPS was provided
      if (sanitized.startsWith("https://")) {
        try {
          const httpFallback = sanitized.replace("https://", "http://");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          const res = await fetch(`${httpFallback}/api/auth/connection-info`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return res.ok;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  public static async testTailscaleConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    url: string;
    message: string;
  }> {
    const config = await StorageService.getConnectionConfig();
    if (!config || !config.tailscale_url) {
      const msg = "Endereço Tailscale não configurado no smartphone.";
      MobileLogger.warn("TAILSCALE_TEST", msg);
      return { success: false, latencyMs: -1, url: "N/A", message: msg };
    }

    // Try sanitized HTTP URL first (8080 is HTTP)
    const tsUrl = this.sanitizeUrl(config.tailscale_url);
    MobileLogger.info("TAILSCALE_TEST", `Iniciando teste de rota Tailscale Mesh: ${tsUrl}`);
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${tsUrl}/api/auth/connection-info`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (res.ok) {
        const msg = `✅ Conexão Tailscale Mesh OK (${latency}ms RTT)`;
        MobileLogger.info("TAILSCALE_TEST", msg);
        return { success: true, latencyMs: latency, url: tsUrl, message: msg };
      } else {
        const msg = `⚠️ Servidor respondeu com HTTP ${res.status}`;
        MobileLogger.warn("TAILSCALE_TEST", msg);
        return { success: false, latencyMs: latency, url: tsUrl, message: msg };
      }
    } catch (e: any) {
      const msg = `❌ Falha ao alcançar nó Tailscale (${tsUrl}). DICA: Ligue o app Tailscale (VPN Conectada) no Smartphone Android. Detalhes: ${e.message}`;
      MobileLogger.error("TAILSCALE_TEST", msg, e);
      return { success: false, latencyMs: -1, url: tsUrl, message: msg };
    }
  }

  public static async testLanConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    url: string;
    message: string;
  }> {
    const config = await StorageService.getConnectionConfig();
    if (!config || !config.lan_url) {
      const msg = "Endereço LAN não configurado.";
      return { success: false, latencyMs: -1, url: "N/A", message: msg };
    }

    const lanUrl = this.sanitizeUrl(config.lan_url);
    MobileLogger.info("LAN_TEST", `Iniciando teste de rota Wi-Fi LAN: ${lanUrl}`);
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${lanUrl}/api/auth/connection-info`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (res.ok) {
        const msg = `✅ Conexão Wi-Fi Local OK (${latency}ms RTT)`;
        MobileLogger.info("LAN_TEST", msg);
        return { success: true, latencyMs: latency, url: lanUrl, message: msg };
      } else {
        const msg = `⚠️ Resposta HTTP ${res.status}`;
        MobileLogger.warn("LAN_TEST", msg);
        return { success: false, latencyMs: latency, url: lanUrl, message: msg };
      }
    } catch (e: any) {
      const msg = `❌ Falha na rede local Wi-Fi: ${e.message}`;
      MobileLogger.error("LAN_TEST", msg, e);
      return { success: false, latencyMs: -1, url: lanUrl, message: msg };
    }
  }

  public static async pairDeviceWithBundle(
    bundle: PairingBundle,
    deviceName: string = "Meu Smartphone"
  ): Promise<ConnectionConfig> {
    const rawLan = this.sanitizeUrl(bundle.lan_url || "http://192.168.1.96:8080");
    const rawTs = bundle.tailscale_url ? this.sanitizeUrl(bundle.tailscale_url) : undefined;

    MobileLogger.info("AUTH", `Iniciando validação de emparelhamento... TS=${rawTs || "N/A"} | LAN=${rawLan}`);

    // Prioritize Tailscale URL as default
    let workingBaseUrl = rawTs || rawLan;
    if (rawTs) {
      const tsOk = await this.probeUrl(rawTs, 3500);
      if (tsOk) {
        workingBaseUrl = rawTs;
      } else {
        const lanOk = await this.probeUrl(rawLan, 2000);
        if (lanOk) workingBaseUrl = rawLan;
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
          app_version: "002.002.137",
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
        active_mode: rawTs ? "TAILSCALE" : "AUTO",
        active_base_url: workingBaseUrl,
        last_connected_at: new Date().toISOString(),
      };

      await StorageService.saveConnectionConfig(connConfig);
      this.cachedBaseUrl = workingBaseUrl;
      this.activeRouteType = (workingBaseUrl.includes(".ts.net") || workingBaseUrl.includes("100.")) ? "TAILSCALE" : "LAN";

      MobileLogger.info("AUTH", `✅ Dispositivo registrado com sucesso! Rota Primária: ${this.activeRouteType} (${workingBaseUrl})`);
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
        mjpeg_url: `${baseUrl}/api/mjpeg/${cam.id}`,
        sub_stream_url: `${baseUrl}/api/mjpeg/${cam.id}`,
        frame_url: `${baseUrl}/api/cameras/${cam.id}/frame`,
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
