export type TabType = 'home' | 'mosaic' | 'lpr' | 'recordings' | 'health' | 'settings';

export type CameraStatus = 'online' | 'offline' | 'alert';

export interface Camera {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  resolution: string;
  fps: number;
  codec: string;
  sensor: string;
  status: CameraStatus;
  ip: string;
  bitrate: string;
  audioEnabled: boolean;
  isPatrolTarget: boolean;
  nightVision: boolean;
  lastMotionTime?: string;
}

export type LprCategory = 'all' | 'family' | 'visitor' | 'suspicious';

export interface LprDetection {
  id: string;
  plate: string;
  plateType: 'mercosul' | 'traditional';
  category: 'family' | 'visitor' | 'suspicious';
  vehicleType: string;
  model: string;
  color: string;
  confidence: number;
  timestamp: string;
  thumbnailUrl: string;
  ownerName?: string;
  cameraName: string;
  speedKmH?: number;
  accessStatus: 'authorized' | 'pending' | 'blocked';
}

export interface SecurityEvent {
  id: string;
  title: string;
  cameraName: string;
  cameraId: string;
  timestamp: string;
  duration: string;
  size: string;
  type: 'motion' | 'continuous' | 'vehicle' | 'lpr';
  thumbnailUrl: string;
  videoUrl?: string;
  importance: 'normal' | 'high' | 'critical';
}

export interface SystemLog {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
}

export interface SystemHealth {
  cpuUsage: number;
  ramUsage: number;
  uptime: string;
  caffeinateActive: boolean;
  networkRoute: 'lan' | 'tailscale' | 'disconnected';
  serverIp: string;
  clientIp: string;
  latencyMs: number;
  diskFreeGb: number;
  diskTotalGb: number;
  retentionDays: number;
  activeStreams: number;
  fpsDropped: number;
  logs: SystemLog[];
}

export interface TVSettings {
  streamQuality: 'auto' | '5mp' | '1080p' | '720p';
  pipEnabled: boolean;
  dpadSensitivity: 'normal' | 'fast' | 'cinematic';
  audioAlerts: boolean;
  autoTourInterval: number; // in seconds
  activeServer: string;
  showScanlines: boolean;
  nightAlarmMode: boolean;
  autoTourActive: boolean;
}
