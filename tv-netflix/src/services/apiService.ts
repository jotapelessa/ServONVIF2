import { Camera, LprDetection, SecurityEvent, SystemHealth } from '../types';

export function getApiBase(): string {
  // Priority 1: URL injected by Android native bridge at page load
  try {
    if ((window as any).__SERVONVIF_BASE_URL) {
      const injected = (window as any).__SERVONVIF_BASE_URL;
      if (injected && injected.startsWith('http')) return injected;
    }
  } catch (e) { /* ignore */ }

  // Priority 2: Android JavascriptInterface method
  try {
    if ((window as any).AndroidNative?.getServerBaseUrl) {
      const nativeBase = (window as any).AndroidNative.getServerBaseUrl();
      if (nativeBase && nativeBase.startsWith('http')) return nativeBase;
    }
  } catch (e) { /* ignore */ }

  // Priority 3: Relative URL detection when served from the backend
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    if ((proto === 'http:' || proto === 'https:') && host && host !== 'appassets.androidplatform.net') {
      if (window.location.port === '8080') return '';
      return `${proto}//${host}:8080`;
    }
  }

  // Priority 4: Default LAN fallback
  return 'http://192.168.1.96:8080';
}

export class TvApiService {
  public static async fetchCameras(): Promise<Camera[]> {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/cameras`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((c: any) => ({
        id: String(c.id),
        name: c.name || `Câmera ${c.id}`,
        location: c.location || 'Área Monitorada',
        streamUrl: `${apiBase}/api/mjpeg/${c.id}`,
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
        lastMotionTime: c.last_motion_at ? new Date(c.last_motion_at).toLocaleTimeString('pt-BR') : undefined
      }));
    } catch (e) {
      console.warn('Could not fetch real cameras from API:', e);
      return [];
    }
  }

  public static async fetchLprDetections(): Promise<LprDetection[]> {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/lpr/detections`);
      if (!res.ok) {
        // Fallback to /api/vehicles if lpr detections route varies
        const vehRes = await fetch(`${apiBase}/api/vehicles`);
        if (vehRes.ok) {
          const vehData = await vehRes.json();
          if (Array.isArray(vehData)) {
            return vehData.map((v: any) => ({
              id: String(v.id),
              plate: v.plate || '---',
              plateType: v.plate_type || 'mercosul',
              category: v.category || 'family',
              vehicleType: v.vehicle_type || 'Veículo',
              model: v.model || '',
              color: v.color || '',
              confidence: v.confidence || 95.0,
              timestamp: v.updated_at || v.created_at || new Date().toISOString(),
              thumbnailUrl: v.snapshot_path ? `${apiBase}/${v.snapshot_path}` : '',
              ownerName: v.owner_name || 'Cadastrado',
              cameraName: v.camera_name || 'Portão Principal',
              accessStatus: v.access_status || 'authorized',
            }));
          }
        }
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((d: any) => ({
        id: String(d.id),
        plate: d.plate || '---',
        plateType: d.plate_type || 'mercosul',
        category: d.category || 'family',
        vehicleType: d.vehicle_type || 'Veículo',
        model: d.model || 'Automóvel',
        color: d.color || '',
        confidence: d.confidence || 98.0,
        timestamp: d.timestamp || d.created_at || new Date().toISOString(),
        thumbnailUrl: d.snapshot_path ? `${apiBase}/${d.snapshot_path}` : '',
        ownerName: d.owner_name,
        cameraName: d.camera_name || 'Câmera Portão',
        accessStatus: d.access_status || 'authorized',
      }));
    } catch (e) {
      return [];
    }
  }

  public static async fetchEvents(): Promise<SecurityEvent[]> {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/events?limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((e: any) => ({
        id: String(e.id),
        title: e.title || `Movimento Câmera ${e.camera_id}`,
        cameraName: e.camera_name || `Câmera ${e.camera_id}`,
        cameraId: String(e.camera_id),
        timestamp: e.created_at || new Date().toISOString(),
        duration: e.duration_seconds ? `${e.duration_seconds}s` : '15s',
        size: e.file_size_formatted || 'Gravado',
        type: e.event_type || 'motion',
        thumbnailUrl: e.thumbnail_path ? `${apiBase}/${e.thumbnail_path}` : '',
        videoUrl: e.video_path ? `${apiBase}/${e.video_path}` : '',
        importance: e.importance || 'normal',
      }));
    } catch (e) {
      return [];
    }
  }

  public static async fetchSystemHealth(): Promise<Partial<SystemHealth>> {
    const apiBase = getApiBase();
    try {
      const [metricsRes, infoRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/settings/metrics`),
        fetch(`${apiBase}/api/auth/connection-info`)
      ]);

      let cpuUsage = 0;
      let ramUsage = 0;
      let networkRoute: 'lan' | 'tailscale' | 'disconnected' = 'lan';
      let serverIp = '192.168.1.96:8080';

      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const metrics = await metricsRes.value.json();
        cpuUsage = metrics.cpu_percent || 0;
        ramUsage = metrics.ram_percent || 0;
      }

      if (infoRes.status === 'fulfilled' && infoRes.value.ok) {
        const info = await infoRes.value.json();
        serverIp = info.lan_url || '192.168.1.96:8080';
        networkRoute = info.is_funnel_active ? 'tailscale' : 'lan';
      }

      return {
        cpuUsage,
        ramUsage,
        serverIp,
        networkRoute,
      };
    } catch (e) {
      return {
        networkRoute: 'disconnected'
      };
    }
  }
}
