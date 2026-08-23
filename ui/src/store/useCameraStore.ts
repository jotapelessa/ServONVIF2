import { create } from "zustand";
import { Camera, MotionEvent, apiClient } from "@/lib/api-client";

interface CameraState {
  cameras: Camera[];
  activeCameraId: number | null;
  loading: boolean;
  fetchCameras: () => Promise<void>;
  setActiveCamera: (id: number | null) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  cameras: [],
  activeCameraId: null,
  loading: false,
  fetchCameras: async () => {
    set({ loading: true });
    try {
      const cameras = await apiClient.getCameras();
      set({ cameras, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
  setActiveCamera: (id) => set({ activeCameraId: id }),
}));

interface AlertState {
  recentEvents: MotionEvent[];
  activeAlarms: Record<number, number>; // cameraId -> timestamp
  addEvent: (event: any) => void;
  clearAlarm: (cameraId: number) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  recentEvents: [],
  activeAlarms: {},
  addEvent: (event) =>
    set((state) => {
      const updatedAlarms = { ...state.activeAlarms, [event.camera_id]: Date.now() };
      return {
        recentEvents: [event, ...state.recentEvents].slice(0, 50),
        activeAlarms: updatedAlarms,
      };
    }),
  clearAlarm: (cameraId) =>
    set((state) => {
      const copy = { ...state.activeAlarms };
      delete copy[cameraId];
      return { activeAlarms: copy };
    }),
}));
