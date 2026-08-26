export const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
};

export const getWsBase = (): string => {
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.hostname}:8080`;
  }
  return process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8080";
};

export const API_BASE = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080");

export const WS_BASE = typeof window !== "undefined"
  ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8080`
  : (process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8080");

export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  ip_address?: string;
  onvif_port?: number;
  username?: string;
  password?: string;
  is_active: boolean;
  sensitivity: number;
  roi_polygon?: number[][];
  ignore_polygons?: number[][][];
  allowed_device_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: number;
  device_id: string;
  name: string;
  ip_address: string;
  device_type: string;
  status: "ALLOWED" | "BLOCKED" | "PAUSED";
  notes?: string;
  manufacturer_model?: string;
  ping_count?: number;
  last_seen: string;
}

export interface MotionEvent {
  id: number;
  camera_id: number;
  camera_name: string;
  timestamp: string;
  score: number;
  video_path?: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  telegram_sent: boolean;
  duration_seconds: number;
  file_size_bytes?: number;
  file_size_formatted?: string;
}

export interface SettingsResponse {
  app_name?: string;
  version?: string;
  port?: number;
  local_ip?: string;
  server_ws_url?: string;
  server_http_url?: string;
  retention_days?: number;
  default_buffer_seconds?: number;
  telegram_enabled?: boolean;
  telegram_paused?: boolean;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_bot_configured?: boolean;
  telegram_cooldown_seconds?: number;
  telegram_video_duration_seconds?: number;
  telegram_photo_quality?: "minima" | "media" | "maxima";
  telegram_dispatch_mode?: "all" | "photo_only" | "video_only";
  telegram_include_prebuffer?: boolean;
  telegram_watermark_enabled?: boolean;
  lpr_enabled?: boolean;
  lpr_min_confidence?: number;
  lpr_notify_telegram?: boolean;
  lpr_notify_tv?: boolean;
  lpr_alarm_on_blocked?: boolean;
  lpr_motorcycle_enabled?: boolean;
  lpr_cooldown_seconds?: number;
  processing_paused?: boolean;
  storage?: {
    total_files: number;
    total_size_mb: number;
    media_path: string;
  };
  system_metrics?: {
    cpu_percent: number;
    ram_percent: number;
    ram_used_mb: number;
    ram_total_mb: number;
    system_ram_used_mb: number;
  };
}

export const apiClient = {
  async getCameras(): Promise<Camera[]> {
    const res = await fetch(`${getApiBase()}/api/cameras/`);
    if (!res.ok) throw new Error("Failed to fetch cameras");
    return res.json();
  },

  async scanCameras(): Promise<any[]> {
    const res = await fetch(`${getApiBase()}/api/cameras/scan`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to scan cameras");
    return res.json();
  },

  async createCamera(data: Partial<Camera>): Promise<Camera> {
    const res = await fetch(`${getApiBase()}/api/cameras/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create camera");
    return res.json();
  },

  async updateCamera(id: number, data: Partial<Camera>): Promise<Camera> {
    const res = await fetch(`${getApiBase()}/api/cameras/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update camera");
    return res.json();
  },

  async deleteCamera(id: number): Promise<void> {
    const res = await fetch(`${getApiBase()}/api/cameras/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete camera");
  },

  async updateROI(
    cameraId: number,
    payload: {
      roi_polygon?: number[][] | null;
      ignore_polygons?: number[][][] | null;
    } | number[][]
  ): Promise<Camera> {
    const bodyPayload = Array.isArray(payload) ? { roi_polygon: payload } : payload;
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/roi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });
    if (!res.ok) throw new Error("Failed to update ROI");
    return res.json();
  },

  async setROI(
    cameraId: number,
    roi_polygon: number[][],
    ignore_polygons?: number[][][]
  ): Promise<Camera> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/roi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roi_polygon, ignore_polygons }),
    });
    if (!res.ok) throw new Error("Failed to set ROI");
    return res.json();
  },

  async captureSnapshot(cameraId: number, sendTelegram: boolean = true): Promise<{
    success: boolean;
    camera_id: number;
    camera_name: string;
    timestamp: string;
    thumbnail_url: string;
    thumbnail_path: string;
    message: string;
  }> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/snapshot?send_telegram=${sendTelegram}`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao capturar foto/snapshot da câmera");
    return data;
  },

  // --- ONVIF Camera Hardware Management ---
  async getOnvifImaging(cameraId: number): Promise<OnvifImagingSettings> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/onvif/imaging`);
    if (!res.ok) throw new Error("Falha ao obter ajustes ONVIF da câmera");
    return res.json();
  },

  async setOnvifImaging(
    cameraId: number,
    payload: {
      brightness?: number;
      contrast?: number;
      color_saturation?: number;
      sharpness?: number;
      ir_cut_filter?: string;
      wdr?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/onvif/imaging`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao aplicar ajustes ONVIF");
    return data;
  },

  async rebootCamera(cameraId: number): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/onvif/reboot`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao reiniciar câmera");
    return data;
  },

  async syncCameraTime(cameraId: number): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/cameras/${cameraId}/onvif/sync-time`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao sincronizar relógio da câmera");
    return data;
  },

  async getEvents(limit = 60, cameraId?: number): Promise<MotionEvent[]> {
    const url = cameraId !== undefined
      ? `${getApiBase()}/api/events/?limit=${limit}&camera_id=${cameraId}`
      : `${getApiBase()}/api/events/?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },

  async deleteEvent(eventId: number): Promise<void> {
    const res = await fetch(`${getApiBase()}/api/events/${eventId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete event");
  },

  async batchDeleteEvents(payload: {
    mode: "day" | "older_than_7_days" | "older_than_30_days" | "all";
    date_str?: string;
    camera_id?: number;
  }): Promise<{ success: boolean; deleted_count: number; message: string }> {
    const res = await fetch(`${getApiBase()}/api/events/batch-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao excluir eventos em lote");
    return data;
  },

  async getSettings(): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/`);
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async updateSettings(payload: any): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async testTelegram(payload?: { bot_token?: string; chat_id?: string }): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/telegram/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao testar Telegram");
    return data;
  },

  async testTelegramPhoto(): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/telegram/test-photo`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao enviar foto de teste para o Telegram");
    return data;
  },

  async testTelegramVideo(): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/telegram/test-video`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao enviar vídeo de teste para o Telegram");
    return data;
  },

  async testTelegramBackup(): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/telegram/test-backup`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao enviar backup para o Telegram");
    return data;
  },

  async triggerCleanup(): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/cleanup`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to run cleanup");
    return res.json();
  },

  async getDiagnosticsLogs(limit = 150, level = "ALL"): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/diagnostics/logs?limit=${limit}&level=${level}`);
    if (!res.ok) throw new Error("Falha ao obter logs do sistema");
    return res.json();
  },

  async simulateMotionAlert(payload?: { camera_id?: number; camera_name?: string; score?: number }): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/diagnostics/simulate-motion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error("Falha ao simular alerta de movimento");
    return res.json();
  },

  async testRTSP(rtsp_url: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/settings/diagnostics/test-rtsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rtsp_url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha no teste RTSP");
    return data;
  },

  async getDevices(): Promise<any[]> {
    const res = await fetch(`${getApiBase()}/api/devices/`);
    if (!res.ok) throw new Error("Falha ao carregar lista de dispositivos");
    return res.json();
  },

  async updateDevice(
    deviceIdOrPk: string | number,
    payload: { device_name?: string; status?: string; notes?: string }
  ): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/devices/${deviceIdOrPk}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao atualizar dispositivo");
    return data;
  },

  async deleteDevice(deviceIdOrPk: string | number): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/devices/${deviceIdOrPk}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao remover dispositivo");
    return data;
  },

  // --- LPR & Vehicles Management ---
  async getVehicles(): Promise<any[]> {
    const res = await fetch(`${getApiBase()}/api/vehicles/`);
    if (!res.ok) throw new Error("Falha ao carregar veículos cadastrados");
    return res.json();
  },

  async createVehicle(payload: {
    plate_number: string;
    owner_name: string;
    vehicle_model?: string;
    category?: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/vehicles/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao cadastrar veículo");
    return data;
  },

  async updateVehicle(
    vehicleId: number,
    payload: {
      plate_number?: string;
      owner_name?: string;
      vehicle_model?: string;
      category?: string;
      notes?: string;
      is_active?: boolean;
    }
  ): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao atualizar veículo");
    return data;
  },

  async deleteVehicle(vehicleId: number): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/vehicles/${vehicleId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao remover veículo");
    return data;
  },

  async getPlateLogs(limit = 100): Promise<any[]> {
    const res = await fetch(`${getApiBase()}/api/vehicles/logs?limit=${limit}`);
    if (!res.ok) throw new Error("Falha ao obter histórico de placas");
    return res.json();
  },

  async getVehicleStats(): Promise<{
    total_vehicles: number;
    moradores_count: number;
    visitantes_count: number;
    bloqueados_count: number;
    logs_today: number;
    total_logs: number;
    last_detected_plate: string | null;
    last_detected_at: string | null;
    last_owner_name: string | null;
  }> {
    const res = await fetch(`${getApiBase()}/api/vehicles/stats`);
    if (!res.ok) throw new Error("Falha ao obter estatísticas de veículos");
    return res.json();
  },

  async deletePlateLog(logId: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/vehicles/logs/${logId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Falha ao excluir registro do histórico");
    return res.json();
  },

  async clearAllPlateLogs(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/vehicles/logs/clear/all`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || "Falha ao limpar histórico de placas");
    return data;
  },

  async simulatePlateDetection(payload: {
    plate_number: string;
    camera_id?: number;
    camera_name?: string;
    confidence?: number;
  }): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/vehicles/simulate-plate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao simular leitura de placa");
    return data;
  },

  async getMetrics(): Promise<{
    cpu_percent: number;
    ram_percent: number;
    ram_used_mb: number;
    ram_total_mb: number;
    system_ram_used_mb: number;
  }> {
    const res = await fetch(`${getApiBase()}/api/settings/metrics`);
    if (!res.ok) throw new Error("Falha ao obter métricas de CPU/RAM");
    return res.json();
  },

  // --- Server Lifecycle, Standby & Configuration Backup/Restore ---
  async pauseProcessing(): Promise<{ success: boolean; paused: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/processing/pause`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao pausar processamento");
    return data;
  },

  async resumeProcessing(): Promise<{ success: boolean; paused: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/processing/resume`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao retomar processamento");
    return data;
  },

  async getProcessingStatus(): Promise<{ paused: boolean; status: string; active_cameras: number; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/processing/status`);
    if (!res.ok) throw new Error("Falha ao obter status de processamento");
    return res.json();
  },

  async shutdownServer(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/system/shutdown`, {
      method: "POST",
    });
    return res.json();
  },

  async restartServer(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/system/restart`, {
      method: "POST",
    });
    return res.json();
  },

  getExportConfigUrl(): string {
    return `${getApiBase()}/api/settings/export-config`;
  },

  async importConfig(payload: any): Promise<{
    success: boolean;
    message: string;
    cameras_restored: number;
    vehicles_restored: number;
    devices_restored: number;
  }> {
    const res = await fetch(`${getApiBase()}/api/settings/import-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Falha ao importar backup de configurações");
    return res.json();
  },

  async sendTelegramBackup(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/settings/backup/telegram`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Falha ao enviar backup" }));
      throw new Error(err.detail || "Erro ao enviar backup ao Telegram");
    }
    return res.json();
  },

  async getTailscaleStatus(): Promise<TailscaleStatus> {
    const res = await fetch(`${API_BASE}/api/settings/tailscale`);
    if (!res.ok) throw new Error("Falha ao obter status do Tailscale");
    return res.json();
  },
};

export interface TailscalePeer {
  id?: string;
  hostname?: string;
  dns_name?: string;
  ip?: string;
  os?: string;
  online?: boolean;
  active?: boolean;
}

export interface TailscaleStatus {
  is_installed: boolean;
  is_running: boolean;
  binary_path?: string | null;
  tailscale_ip?: string | null;
  magicdns_hostname?: string | null;
  self_node_name?: string | null;
  tailnet_name?: string | null;
  peers_count: number;
  peers: TailscalePeer[];
  install_guide: {
    mac_brew: string;
    mac_appstore: string;
    linux_curl: string;
    windows_winget: string;
    android_playstore: string;
    android_apk: string;
  };
}

export interface OnvifImagingSettings {
  success: boolean;
  brightness: number;
  contrast: number;
  color_saturation: number;
  sharpness: number;
  ir_cut_filter: "AUTO" | "ON" | "OFF" | string;
  wdr: "ON" | "OFF" | string;
  camera_ip: string;
  web_url: string;
  error?: string;
}
