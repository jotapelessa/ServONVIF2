export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8080";

export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  ip_address?: string;
  onvif_port?: number;
  is_active: boolean;
  sensitivity: number;
  roi_polygon?: number[][];
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
}

export const apiClient = {
  async getCameras(): Promise<Camera[]> {
    const res = await fetch(`${API_BASE}/api/cameras/`);
    if (!res.ok) throw new Error("Failed to fetch cameras");
    return res.json();
  },

  async scanCameras(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/cameras/scan`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to scan cameras");
    return res.json();
  },

  async createCamera(data: Partial<Camera>): Promise<Camera> {
    const res = await fetch(`${API_BASE}/api/cameras/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create camera");
    return res.json();
  },

  async updateCamera(id: number, data: Partial<Camera>): Promise<Camera> {
    const res = await fetch(`${API_BASE}/api/cameras/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update camera");
    return res.json();
  },

  async deleteCamera(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cameras/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete camera");
  },

  async updateROI(cameraId: number, roi_polygon: number[][]): Promise<Camera> {
    const res = await fetch(`${API_BASE}/api/cameras/${cameraId}/roi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roi_polygon }),
    });
    if (!res.ok) throw new Error("Failed to update ROI");
    return res.json();
  },

  async getEvents(limit = 60, cameraId?: number): Promise<MotionEvent[]> {
    const url = cameraId !== undefined
      ? `${API_BASE}/api/events/?limit=${limit}&camera_id=${cameraId}`
      : `${API_BASE}/api/events/?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },

  async deleteEvent(eventId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete event");
  },

  async batchDeleteEvents(payload: {
    mode: "day" | "older_than_7_days" | "older_than_30_days" | "all";
    date_str?: string;
    camera_id?: number;
  }): Promise<{ success: boolean; deleted_count: number; message: string }> {
    const res = await fetch(`${API_BASE}/api/events/batch-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao excluir eventos em lote");
    return data;
  },

  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/`);
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async updateSettings(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async testTelegram(payload?: { bot_token?: string; chat_id?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/telegram/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao testar Telegram");
    return data;
  },

  async triggerCleanup(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/cleanup`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to run cleanup");
    return res.json();
  },

  async getDiagnosticsLogs(limit = 150, level = "ALL"): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/diagnostics/logs?limit=${limit}&level=${level}`);
    if (!res.ok) throw new Error("Falha ao obter logs do sistema");
    return res.json();
  },

  async simulateMotionAlert(payload?: { camera_id?: number; camera_name?: string; score?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/diagnostics/simulate-motion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error("Falha ao simular alerta de movimento");
    return res.json();
  },

  async testRTSP(rtsp_url: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/diagnostics/test-rtsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rtsp_url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha no teste RTSP");
    return data;
  },

  async getDevices(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/devices/`);
    if (!res.ok) throw new Error("Falha ao carregar lista de dispositivos");
    return res.json();
  },

  async updateDevice(
    deviceIdOrPk: string | number,
    payload: { device_name?: string; status?: string; notes?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/api/devices/${deviceIdOrPk}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao atualizar dispositivo");
    return data;
  },

  async deleteDevice(deviceIdOrPk: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/api/devices/${deviceIdOrPk}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao remover dispositivo");
    return data;
  },

  // --- LPR & Vehicles Management ---
  async getVehicles(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/vehicles/`);
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
    const res = await fetch(`${API_BASE}/api/vehicles/`, {
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
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao atualizar veículo");
    return data;
  },

  async deleteVehicle(vehicleId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao remover veículo");
    return data;
  },

  async getPlateLogs(limit = 50): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/vehicles/logs?limit=${limit}`);
    if (!res.ok) throw new Error("Falha ao obter histórico de placas");
    return res.json();
  },

  async simulatePlateDetection(payload: {
    plate_number: string;
    camera_id?: number;
    camera_name?: string;
    confidence?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/vehicles/simulate-plate`, {
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
    const res = await fetch(`${API_BASE}/api/settings/metrics`);
    if (!res.ok) throw new Error("Falha ao obter métricas de CPU/RAM");
    return res.json();
  },

  // --- Server Lifecycle & Configuration Backup/Restore ---
  async shutdownServer(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/api/settings/system/shutdown`, {
      method: "POST",
    });
    return res.json();
  },

  async restartServer(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/api/settings/system/restart`, {
      method: "POST",
    });
    return res.json();
  },

  getExportConfigUrl(): string {
    return `${API_BASE}/api/settings/export-config`;
  },

  async importConfig(payload: any): Promise<{
    success: boolean;
    message: string;
    cameras_restored: number;
    vehicles_restored: number;
    devices_restored: number;
  }> {
    const res = await fetch(`${API_BASE}/api/settings/import-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Falha ao importar backup de configurações");
    return data;
  },
};
