import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ConnectionConfig } from "../types";
import { StorageService } from "../services/storage";
import { ApiService } from "../services/api";
import { Header } from "../components/Header";
import {
  Settings,
  Wifi,
  Radio,
  Sliders,
  LogOut,
  CheckCircle2,
  HardDrive,
  Cpu,
  Shield,
} from "lucide-react-native";

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [streamQuality, setStreamQuality] = useState<"AUTO" | "HIGH_5MP" | "DATA_SAVER">("AUTO");
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const c = await StorageService.getConnectionConfig();
    const q = await StorageService.getStreamQuality();
    setConfig(c);
    setStreamQuality(q);
    setRouteType(ApiService.getActiveRouteType());
  };

  const handleSetQuality = async (q: "AUTO" | "HIGH_5MP" | "DATA_SAVER") => {
    setStreamQuality(q);
    await StorageService.setStreamQuality(q);
  };

  const handleLogout = () => {
    Alert.alert(
      "Desconectar",
      "Deseja realmente desvincular este smartphone do servidor ServONVIF?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            await StorageService.clearConnectionConfig();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Diagnósticos & Ajustes"
        routeType={routeType}
        onRefresh={loadSettings}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Network Route Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status de Conexão Ativa</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispositivo:</Text>
            <Text style={styles.infoValue}>{config?.device_name || "Smartphone"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rota em Uso:</Text>
            <View style={styles.routeTag}>
              {routeType === "LAN" ? <Wifi size={12} color="#10b981" /> : <Radio size={12} color="#06b6d4" />}
              <Text style={[styles.routeTagText, routeType === "LAN" ? styles.lanColor : styles.tsColor]}>
                {routeType === "LAN" ? "Wi-Fi LAN (Baixa Latência)" : "Tailscale Criptografado (4G/5G)"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endereço Local LAN:</Text>
            <Text style={styles.monoValue}>{config?.lan_url || "192.168.1.96:8080"}</Text>
          </View>

          {config?.tailscale_url && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço Tailscale:</Text>
              <Text style={styles.monoValue} numberOfLines={1}>
                {config.tailscale_url}
              </Text>
            </View>
          )}
        </View>

        {/* Stream Quality Selector Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Qualidade do Stream no Smartphone</Text>
          <Text style={styles.cardSubtitle}>
            Ajuste a resolução padrão para economizar seu plano de dados móveis 4G/5G.
          </Text>

          <View style={styles.qualityOptions}>
            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "AUTO" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("AUTO")}
            >
              <Text style={[styles.qualityBtnText, streamQuality === "AUTO" && styles.activeQualityBtnText]}>
                Automático (Wi-Fi 5MP / 4G Sub)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "HIGH_5MP" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("HIGH_5MP")}
            >
              <Text style={[styles.qualityBtnText, streamQuality === "HIGH_5MP" && styles.activeQualityBtnText]}>
                Sempre 5MP Nativo (CRF 17 HD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "DATA_SAVER" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("DATA_SAVER")}
            >
              <Text style={[styles.qualityBtnText, streamQuality === "DATA_SAVER" && styles.activeQualityBtnText]}>
                Economia Extrema (720p / 15 FPS)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disconnect Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={16} color="#f87171" />
          <Text style={styles.logoutBtnText}>Desconectar deste Servidor</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#131b2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 11,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  monoValue: {
    color: "#38bdf8",
    fontSize: 10,
    fontFamily: "monospace",
    maxWidth: 200,
  },
  routeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  lanColor: {
    color: "#34d399",
  },
  tsColor: {
    color: "#22d3ee",
  },
  qualityOptions: {
    gap: 8,
    marginTop: 4,
  },
  qualityBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#090d16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  activeQualityBtn: {
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    borderColor: "#2563eb",
  },
  qualityBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  activeQualityBtnText: {
    color: "#60a5fa",
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  logoutBtnText: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "700",
  },
});
