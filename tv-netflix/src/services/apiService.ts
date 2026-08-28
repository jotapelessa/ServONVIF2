import { Camera, LprDetection, SecurityEvent, SystemHealth } from '../types';

const API_BASE = window.location.port === '8080' ? '' : (window.location.protocol + '//' + window.location.hostname + ':8080');

export class TvApiService {
  public static async fetchCameras(): Promise<Camera[]> {
    try {
      const res = await fetch(`${API_BASE}/api/cameras`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map((c: any) => ({
        id: String(c.id),
        name: c.name || `Câmera ${c.id}`,
        location: c.location || 'Área Monitorada',
        streamUrl: `${API_BASE}/api/mjpeg/${c.id}`,
        resolution: c.resolution || '1080p Full HD',
        fps: c.fps || 25,
        codec: c.codec || 'RTSP H.264',
        sensor: c.sensor || 'ONVIF Sensor',
        status: c.is_active ? 'online' : 'offline',
        ip: c.ip || '192.168.1.X',
        bitrate: c.bitrate || '4.0 Mbps',
        audioEnabled: c.audio_enabled ?? true,
        isPatrolTarget: true,
        nightVision: false,
      }));
    } catch (e) {
      console.warn('Could not fetch cameras from API, using fallback:', e);
      return [];
    }
  }

  public static async fetchLprDetections(): Promise<LprDetection[]> {
    try {
      const res = await fetch(`${API_BASE}/api/lpr/detections`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map((d: any) => ({
        id: String(d.id),
        plate: d.plate || 'BRA2E19',
        plateType: d.plate_type || 'mercosul',
        category: d.category || 'family',
        vehicleType: d.vehicle_type || 'Veículo',
        model: d.model || 'Automóvel',
        color: d.color || 'Prata',
        confidence: d.confidence || 98.0,
        timestamp: d.timestamp || new Date().toISOString(),
        thumbnailUrl: d.snapshot_path ? `${API_BASE}/${d.snapshot_path}` : '',
        ownerName: d.owner_name,
        cameraName: d.camera_name || 'Câmera Garagem',
        accessStatus: d.access_status || 'authorized',
      }));
    } catch (e) {
      return [];
    }
  }

  public static async fetchEvents(): Promise<SecurityEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/api/events?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map((e: any) => ({
        id: String(e.id),
        title: e.title || `Movimento Câmera ${e.camera_id}`,
        cameraName: e.camera_name || `Câmera ${e.camera_id}`,
        cameraId: String(e.camera_id),
        timestamp: e.created_at || new Date().toISOString(),
        duration: `${e.duration_seconds || 15}s`,
        size: e.file_size_formatted || '12 MB',
        type: e.event_type || 'motion',
        thumbnailUrl: e.thumbnail_path ? `${API_BASE}/${e.thumbnail_path}` : '',
        videoUrl: e.video_path ? `${API_BASE}/${e.video_path}` : '',
        importance: e.importance || 'normal',
      }));
    } catch (e) {
      return [];
    }
  }

  public static async fetchSystemHealth(): Promise<Partial<SystemHealth>> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/connection-info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        serverIp: data.lan_url || '192.168.1.96:8080',
        networkRoute: data.is_funnel_active ? 'tailscale' : 'lan',
      };
    } catch (e) {
      return {};
    }
  }
}
