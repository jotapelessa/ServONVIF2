import { Camera, LprDetection, SecurityEvent, SystemHealth, TVSettings } from '../types';

// Listas reais iniciam vazias e são preenchidas exclusivamente pelo backend ServONVIF
export const INITIAL_CAMERAS: Camera[] = [];

export const INITIAL_LPR_DETECTIONS: LprDetection[] = [];

export const INITIAL_EVENTS: SecurityEvent[] = [];

export const INITIAL_SYSTEM_HEALTH: SystemHealth = {
  cpuUsage: 0.0,
  ramUsage: 0.0,
  uptime: 'Conectando...',
  caffeinateActive: true,
  networkRoute: 'lan',
  serverIp: '192.168.1.96:8080',
  clientIp: 'Android TV',
  latencyMs: 0,
  diskFreeGb: 0.0,
  diskTotalGb: 0.0,
  retentionDays: 15,
  activeStreams: 0,
  fpsDropped: 0,
  logs: []
};

export const INITIAL_SETTINGS: TVSettings = {
  streamQuality: '5mp',
  pipEnabled: true,
  dpadSensitivity: 'fast',
  audioAlerts: true,
  autoTourInterval: 10,
  activeServer: 'ServONVIF NVR (192.168.1.96)',
  showScanlines: false,
  nightAlarmMode: false,
  autoTourActive: false
};
