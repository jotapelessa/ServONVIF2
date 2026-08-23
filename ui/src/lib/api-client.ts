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
  created_at: string;
  updated_at: string;
}

export interface MotionEvent {
  id: number;
  camera_id: number;
  camera_name: string;
  timestamp: string;
  score: number;
  video_path?: string;
  thumbnail_path?: string;
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
};
