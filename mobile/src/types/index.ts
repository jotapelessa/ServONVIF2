export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  ip_address?: string;
  is_active: boolean;
  sensitivity: number;
  width?: number;
  height?: number;
  fps?: number;
  mjpeg_url?: string;
  sub_stream_url?: string;
  profile_token?: string;
  created_at?: string;
}

export interface MotionEvent {
  id: number;
  camera_id: number;
  camera_name: string;
  timestamp: string;
  score: number;
  thumbnail_url?: string;
  video_path?: string;
  telegram_sent?: boolean;
  duration_seconds?: number;
}

export interface PlateLog {
  id: number;
  plate_number: string;
  owner_name?: string;
  category?: "MORADOR" | "VISITANTE" | "PRESTADOR" | "SUSPEITO" | "DESCONHECIDO";
  timestamp: string;
  confidence: number;
  vehicle_model?: string;
  snapshot_url?: string;
  camera_id?: number;
  camera_name?: string;
}

export interface ConnectionConfig {
  lan_url: string;
  tailscale_url?: string;
  session_token: string;
  server_name: string;
  device_id: string;
  device_name: string;
  active_mode: "LAN" | "TAILSCALE" | "AUTO";
  active_base_url: string;
  last_connected_at: string;
}

export interface PairingBundle {
  app: string;
  token: string;
  lan_url: string;
  tailscale_url?: string;
  expires_at: number;
  server_name?: string;
}
