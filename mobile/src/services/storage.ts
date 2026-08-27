import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConnectionConfig } from "../types";

const STORAGE_KEYS = {
  CONNECTION_CONFIG: "@servonvif_mobile_conn_config",
  STREAM_QUALITY_PREF: "@servonvif_mobile_stream_quality", // "AUTO" | "HIGH_5MP" | "DATA_SAVER"
  NOTIFICATIONS_ENABLED: "@servonvif_mobile_notif_enabled",
};

export const StorageService = {
  async saveConnectionConfig(config: ConnectionConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save connection config:", e);
    }
  },

  async getConnectionConfig(): Promise<ConnectionConfig | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to load connection config:", e);
      return null;
    }
  },

  async clearConnectionConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONNECTION_CONFIG);
    } catch (e) {
      console.error("Failed to clear connection config:", e);
    }
  },

  async setStreamQuality(quality: "AUTO" | "HIGH_5MP" | "DATA_SAVER"): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.STREAM_QUALITY_PREF, quality);
  },

  async getStreamQuality(): Promise<"AUTO" | "HIGH_5MP" | "DATA_SAVER"> {
    const q = await AsyncStorage.getItem(STORAGE_KEYS.STREAM_QUALITY_PREF);
    return (q as any) || "AUTO";
  },
};
