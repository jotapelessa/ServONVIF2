import { Camera, LprDetection, SecurityEvent, SystemHealth, TVSettings } from '../types';

export const INITIAL_CAMERAS: Camera[] = [
  {
    id: 'cam-01',
    name: 'Garagem & Portão de Entrada',
    location: 'Acesso Principal',
    streamUrl: '/api/stream/cam-01/live',
    resolution: '5MP ULTRA HD (2592x1944)',
    fps: 25,
    codec: 'RTSP H.264 Main Profile',
    sensor: 'Sony Starvis IMX335',
    status: 'online',
    ip: '192.168.1.101',
    bitrate: '4.8 Mbps',
    audioEnabled: true,
    isPatrolTarget: true,
    nightVision: false,
    lastMotionTime: 'Há 1 minuto'
  },
  {
    id: 'cam-02',
    name: 'Piscina & Área Gourmet',
    location: 'Área de Lazer Externa',
    streamUrl: '/api/stream/cam-02/live',
    resolution: '4K UHD (3840x2160)',
    fps: 30,
    codec: 'RTSP H.265 HEVC',
    sensor: 'Sony Starvis 2 IMX585',
    status: 'online',
    ip: '192.168.1.102',
    bitrate: '6.2 Mbps',
    audioEnabled: false,
    isPatrolTarget: true,
    nightVision: false,
    lastMotionTime: 'Há 12 minutos'
  },
  {
    id: 'cam-03',
    name: 'Perímetro Norte & Muro',
    location: 'Perímetro Externo',
    streamUrl: '/api/stream/cam-03/live',
    resolution: '1080p Full HD',
    fps: 25,
    codec: 'RTSP H.264',
    sensor: 'OmniVision OS05A20',
    status: 'alert', // Currently detecting motion
    ip: '192.168.1.103',
    bitrate: '3.4 Mbps',
    audioEnabled: true,
    isPatrolTarget: true,
    nightVision: true,
    lastMotionTime: 'AGORA (Alerta Ativo)'
  },
  {
    id: 'cam-04',
    name: 'Hall & Recepção Social',
    location: 'Entrada Social',
    streamUrl: '/api/stream/cam-04/live',
    resolution: '1080p Full HD',
    fps: 30,
    codec: 'RTSP H.264',
    sensor: 'Sony IMX327 Ultra Low Light',
    status: 'online',
    ip: '192.168.1.104',
    bitrate: '2.9 Mbps',
    audioEnabled: true,
    isPatrolTarget: true,
    nightVision: false,
    lastMotionTime: 'Há 4 minutos'
  },
  {
    id: 'cam-05',
    name: 'Jardim Lateral & Bosque',
    location: 'Corredor Leste',
    streamUrl: '/api/stream/cam-05/live',
    resolution: '4MP QHD',
    fps: 20,
    codec: 'RTSP H.265',
    sensor: 'SmartSens SC430AI',
    status: 'online',
    ip: '192.168.1.105',
    bitrate: '3.1 Mbps',
    audioEnabled: false,
    isPatrolTarget: true,
    nightVision: true,
    lastMotionTime: 'Há 45 minutos'
  },
  {
    id: 'cam-06',
    name: 'Garagem Subterrânea B2',
    location: 'Estacionamento Inferior',
    streamUrl: '/api/stream/cam-06/live',
    resolution: '1080p Full HD',
    fps: 15,
    codec: 'RTSP H.264',
    sensor: 'Aptina AR0237',
    status: 'offline', // Simulated offline camera per requirements
    ip: '192.168.1.106',
    bitrate: '0 Kbps',
    audioEnabled: false,
    isPatrolTarget: false,
    nightVision: false,
    lastMotionTime: 'Offline há 2 horas'
  }
];

export const INITIAL_LPR_DETECTIONS: LprDetection[] = [
  {
    id: 'lpr-01',
    plate: 'BRA2E19',
    plateType: 'mercosul',
    category: 'family',
    vehicleType: 'SUV',
    model: 'Volvo XC60 T8 Recharge',
    color: 'Cinza Metálico',
    confidence: 99.4,
    timestamp: 'Há 2 minutos (14:33)',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    ownerName: 'Dr. Roberto Lessa (Residência Principal)',
    cameraName: 'Garagem & Portão de Entrada',
    speedKmH: 14,
    accessStatus: 'authorized'
  },
  {
    id: 'lpr-02',
    plate: 'RKS8H44',
    plateType: 'mercosul',
    category: 'family',
    vehicleType: 'Sedan Esportivo',
    model: 'BMW 330e M Sport',
    color: 'Azul Portimão',
    confidence: 98.7,
    timestamp: 'Há 18 minutos (14:17)',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
    ownerName: 'Mariana Lessa (Filha)',
    cameraName: 'Garagem & Portão de Entrada',
    speedKmH: 18,
    accessStatus: 'authorized'
  },
  {
    id: 'lpr-03',
    plate: 'FED4J92',
    plateType: 'mercosul',
    category: 'visitor',
    vehicleType: 'Furgão Utilitário',
    model: 'Mercedes-Benz Sprinter 315',
    color: 'Branco',
    confidence: 96.2,
    timestamp: 'Há 45 minutos (13:50)',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80',
    ownerName: 'Logística Mercado Livre (Entrega Expressa)',
    cameraName: 'Garagem & Portão de Entrada',
    speedKmH: 12,
    accessStatus: 'pending'
  },
  {
    id: 'lpr-04',
    plate: 'KTY7821',
    plateType: 'traditional',
    category: 'suspicious',
    vehicleType: 'Hatch',
    model: 'VW Gol 1.6 Total Flex',
    color: 'Preto Fosco',
    confidence: 92.1,
    timestamp: 'Há 1 hora (13:30)',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80',
    ownerName: 'Não Identificado • Parada suspeita em perímetro',
    cameraName: 'Perímetro Norte & Muro',
    speedKmH: 5,
    accessStatus: 'blocked'
  },
  {
    id: 'lpr-05',
    plate: 'GHT3B09',
    plateType: 'mercosul',
    category: 'visitor',
    vehicleType: 'Sedan',
    model: 'Toyota Corolla Altis Hybrid',
    color: 'Prata',
    confidence: 97.9,
    timestamp: 'Há 2 horas (12:35)',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=600&q=80',
    ownerName: 'Visita - Eng. Carlos Eduardo',
    cameraName: 'Garagem & Portão de Entrada',
    speedKmH: 16,
    accessStatus: 'authorized'
  }
];

export const INITIAL_EVENTS: SecurityEvent[] = [
  {
    id: 'evt-01',
    title: 'Detecção de Movimento Humano',
    cameraName: 'Perímetro Norte & Muro',
    cameraId: 'cam-03',
    timestamp: '14:34:10 • Hoje',
    duration: '00:35s',
    size: '16.4 MB',
    type: 'motion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=600&q=80',
    importance: 'critical'
  },
  {
    id: 'evt-02',
    title: 'Entrada de Veículo com Reconhecimento LPR',
    cameraName: 'Garagem & Portão de Entrada',
    cameraId: 'cam-01',
    timestamp: '14:33:02 • Hoje',
    duration: '00:45s',
    size: '22.1 MB',
    type: 'vehicle',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    importance: 'high'
  },
  {
    id: 'evt-03',
    title: 'Pessoa Detectada no Hall Social',
    cameraName: 'Hall & Recepção Social',
    cameraId: 'cam-04',
    timestamp: '14:15:20 • Hoje',
    duration: '00:28s',
    size: '12.8 MB',
    type: 'motion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    importance: 'normal'
  },
  {
    id: 'evt-04',
    title: 'Movimento em Área Gourmet',
    cameraName: 'Piscina & Área Gourmet',
    cameraId: 'cam-02',
    timestamp: '13:48:11 • Hoje',
    duration: '01:10s',
    size: '38.5 MB',
    type: 'motion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
    importance: 'normal'
  },
  {
    id: 'evt-05',
    title: 'Gravação Contínua Automática - Turno Diurno',
    cameraName: 'Garagem & Portão de Entrada',
    cameraId: 'cam-01',
    timestamp: '12:00:00 • Hoje',
    duration: '60:00s',
    size: '1.24 GB',
    type: 'continuous',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    importance: 'normal'
  }
];

export const INITIAL_SYSTEM_HEALTH: SystemHealth = {
  cpuUsage: 28.4,
  ramUsage: 42.1,
  uptime: '18 dias, 7 horas e 22 min',
  caffeinateActive: true,
  networkRoute: 'lan',
  serverIp: '192.168.1.96:8080',
  clientIp: '192.168.1.188 (Android TV 4K)',
  latencyMs: 8,
  diskFreeGb: 184.6,
  diskTotalGb: 512.0,
  retentionDays: 15,
  activeStreams: 5,
  fpsDropped: 0,
  logs: [
    { id: 'log-1', time: '14:34:12', level: 'info', module: 'ONVIF-WS', message: 'Stream Cam-03 (Perímetro Norte) transmitindo a 25fps via RTSP/H.264' },
    { id: 'log-2', time: '14:33:05', level: 'success', module: 'AI-LPR', message: 'Placa BRA2E19 identificada com 99.4% de confiança no Portão' },
    { id: 'log-3', time: '14:30:00', level: 'info', module: 'CAFFEINATE', message: 'Daemon de energia ativo impedindo suspensão do Mac Mini NVR' },
    { id: 'log-4', time: '14:15:22', level: 'warn', module: 'NETWORK', message: 'Flutuação momentânea de jitter LAN (+4ms) corrigida por buffer' },
    { id: 'log-5', time: '12:45:00', level: 'error', module: 'CAM-06', message: 'Câmera B2 perdeu comunicação RTSP (Socket timeout 5000ms)' }
  ]
};

export const INITIAL_SETTINGS: TVSettings = {
  streamQuality: '5mp',
  pipEnabled: true,
  dpadSensitivity: 'fast',
  audioAlerts: true,
  autoTourInterval: 10,
  activeServer: 'ServONVIF NVR Core (192.168.1.96)',
  showScanlines: false,
  nightAlarmMode: false,
  autoTourActive: false
};
