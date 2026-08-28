import { Platform } from "react-native";
import Constants from "expo-constants";
import { StorageService } from "./storage";
import { ApiService } from "./api";

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  tag: string;
  message: string;
  details?: any;
}

class MobileLoggerService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;
  private listeners: Array<() => void> = [];
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Capture global JS unhandled errors
    if ((global as any).ErrorUtils) {
      const originalHandler = (global as any).ErrorUtils.getGlobalHandler();
      (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        this.error("GLOBAL_CRASH", `Fatal: ${isFatal} - ${error?.message || error}`, error?.stack);
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    this.info("SYSTEM", `MobileLogger inicializado. Versão: ${this.getAppVersion()} (Plataforma: ${Platform.OS} ${Platform.Version})`);
  }

  public getAppVersion(): string {
    return (
      Constants.expoConfig?.version ||
      Constants.manifest2?.extra?.expoClient?.version ||
      "002.002.127"
    );
  }

  private addLog(level: "INFO" | "WARN" | "ERROR" | "DEBUG", tag: string, message: string, details?: any) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;

    const entry: LogEntry = {
      timestamp: timeStr,
      level,
      tag,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notifyListeners();
  }

  public info(tag: string, message: string, details?: any) {
    this.addLog("INFO", tag, message, details);
    console.log(`[${tag}] ${message}`, details || "");
  }

  public warn(tag: string, message: string, details?: any) {
    this.addLog("WARN", tag, message, details);
    console.warn(`[${tag}] ${message}`, details || "");
  }

  public error(tag: string, message: string, details?: any) {
    this.addLog("ERROR", tag, message, details);
    console.error(`[${tag}] ${message}`, details || "");
  }

  public debug(tag: string, message: string, details?: any) {
    this.addLog("DEBUG", tag, message, details);
    console.log(`[DEBUG] [${tag}] ${message}`, details || "");
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.info("SYSTEM", "Console de logs mobile limpo pelo usuário.");
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }

  public async generateFullDiagnosticReport(): Promise<string> {
    const config = await StorageService.getConnectionConfig();
    const streamQuality = await StorageService.getStreamQuality();
    const activeRoute = ApiService.getActiveRouteType();
    const nowIso = new Date().toISOString();

    const header = [
      "=================================================================",
      "📱 RELATÓRIO COMPLETO DE DIAGNÓSTICO — SERVONVIF MOBILE",
      "=================================================================",
      `• Origem da Aplicação : ServONVIF Mobile (React Native / Standalone)`,
      `• Versão do App       : v${this.getAppVersion()}`,
      `• Sistema Operacional : ${Platform.OS.toUpperCase()} (Versão ${Platform.Version})`,
      `• Dispositivo Nome    : ${config?.device_name || "Smartphone"}`,
      `• ID do Dispositivo   : ${config?.device_id || "Não Registrado"}`,
      `• Rota Ativa de Rede  : ${activeRoute} (${activeRoute === "LAN" ? config?.lan_url : config?.tailscale_url})`,
      `• Qualidade de Stream : ${streamQuality}`,
      `• Data / Hora do Relatório: ${nowIso}`,
      "=================================================================",
      "📜 LOGS COMPLETOS DE OPERAÇÃO EM TEMPO REAL:",
      "=================================================================",
    ];

    const body =
      this.logs.length === 0
        ? ["Nenhum log registrado até o momento."]
        : this.logs
            .map((l) => {
              const detailsStr = l.details ? ` | Detalhes: ${typeof l.details === "object" ? JSON.stringify(l.details) : l.details}` : "";
              return `[${l.timestamp}] [${l.level}] [${l.tag}] ${l.message}${detailsStr}`;
            })
            .reverse();

    const footer = [
      "=================================================================",
      "🏁 FIM DO RELATÓRIO DE DIAGNÓSTICO MOBILE",
      "=================================================================",
    ];

    return [...header, ...body, ...footer].join("\n");
  }

  public async copyReportToClipboard(): Promise<string> {
    const report = await this.generateFullDiagnosticReport();
    try {
      // Dynamic import to prevent bundler failure if package cache was not refreshed
      const ClipboardModule = require("expo-clipboard");
      if (ClipboardModule && ClipboardModule.setStringAsync) {
        await ClipboardModule.setStringAsync(report);
      }
    } catch (e: any) {
      this.warn("SYSTEM", `Clipboard nativo indisponível: ${e?.message}`);
    }
    this.info("SYSTEM", "📋 Relatório de diagnóstico pronto e copiado.");
    return report;
  }
}

export const MobileLogger = new MobileLoggerService();
