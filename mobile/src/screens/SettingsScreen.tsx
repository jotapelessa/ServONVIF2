import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ConnectionConfig } from "../types";
import { StorageService } from "../services/storage";
import { ApiService } from "../services/api";
import { Header } from "../components/Header";
import {
  Wifi,
  Radio,
  Sliders,
  LogOut,
  CheckCircle2,
  Activity,
  HardDrive,
  Shield,
  Terminal,
  Copy,
  Trash2,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";
import { MobileLogger, LogEntry } from "../services/mobileLogger";

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [streamQuality, setStreamQuality] = useState<"AUTO" | "HIGH_5MP" | "DATA_SAVER">("AUTO");
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(MobileLogger.getLogs());
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    loadSettings();
    const unsubscribe = MobileLogger.subscribe(() => {
      setLogs(MobileLogger.getLogs());
    });
    return () => unsubscribe();
  }, []);

  const loadSettings = async () => {
    const c = await StorageService.getConnectionConfig();
    const q = await StorageService.getStreamQuality();
    setConfig(c);
    setStreamQuality(q);
    setRouteType(ApiService.getActiveRouteType());
  };

  const handleSetQuality = async (q: "AUTO" | "HIGH_5MP" | "DATA_SAVER") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setStreamQuality(q);
    await StorageService.setStreamQuality(q);
  };

  const handleTestPing = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsTestingPing(true);
    setPingResult(null);
    const start = Date.now();
    try {
      await ApiService.sendDevicePing();
      const rtt = Date.now() - start;
      setPingResult(`${rtt} ms (Excelente)`);
    } catch {
      setPingResult("Falha no Ping");
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleCopyLogs = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await MobileLogger.copyReportToClipboard();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
    Alert.alert(
      "📋 Logs Copiados!",
      "O relatório completo de diagnóstico do Smartphone foi copiado para a área de transferência. Cole-o no chat para análise.",
      [{ text: "OK" }]
    );
  };

  const handleClearLogs = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    MobileLogger.clear();
  };

  const handleLogout = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    Alert.alert(
      "Desconectar Smartphone",
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
        {/* Connection Telemetry Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={16} color={theme.colors.accent} />
            <Text style={styles.cardTitle}>Conectividade & Rede</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispositivo:</Text>
            <Text style={styles.infoValue}>{config?.device_name || "Smartphone"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rota em Uso:</Text>
            <View style={styles.routeTag}>
              {routeType === "LAN" ? (
                <Wifi size={12} color={theme.colors.success} />
              ) : (
                <Radio size={12} color={theme.colors.tailscale} />
              )}
              <Text
                style={[
                  styles.routeTagText,
                  routeType === "LAN" ? styles.lanColor : styles.tsColor,
                ]}
              >
                {routeType === "LAN" ? "Wi-Fi LAN Local" : "Tailscale 4G/5G Mesh"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endereço LAN:</Text>
            <Text style={styles.monoValue}>{config?.lan_url || "192.168.1.96:8080"}</Text>
          </View>

          {config?.tailscale_url && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tailscale MagicDNS:</Text>
              <Text style={styles.monoValue} numberOfLines={1}>
                {config.tailscale_url}
              </Text>
            </View>
          )}

          {/* Test Ping Button */}
          <TouchableOpacity
            style={styles.pingBtn}
            onPress={handleTestPing}
            disabled={isTestingPing}
            activeOpacity={0.7}
          >
            <Activity size={14} color={theme.colors.accent} />
            <Text style={styles.pingBtnText}>
              {isTestingPing ? "Medindo latência..." : "Testar Latência do Servidor"}
            </Text>
            {pingResult && <Text style={styles.pingBadge}>{pingResult}</Text>}
          </TouchableOpacity>
        </View>

        {/* Stream Quality Selector Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sliders size={16} color={theme.colors.accent} />
            <Text style={styles.cardTitle}>Qualidade do Stream</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Ajuste a resolução padrão para otimizar fluidez e economizar seu plano de dados.
          </Text>

          <View style={styles.qualityOptions}>
            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "AUTO" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("AUTO")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.qualityBtnText,
                  streamQuality === "AUTO" && styles.activeQualityBtnText,
                ]}
              >
                Automático (Wi-Fi 5MP / 4G Sub)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "HIGH_5MP" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("HIGH_5MP")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.qualityBtnText,
                  streamQuality === "HIGH_5MP" && styles.activeQualityBtnText,
                ]}
              >
                Sempre 5MP Nativo (CRF 17 HD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityBtn, streamQuality === "DATA_SAVER" && styles.activeQualityBtn]}
              onPress={() => handleSetQuality("DATA_SAVER")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.qualityBtnText,
                  streamQuality === "DATA_SAVER" && styles.activeQualityBtnText,
                ]}
              >
                Economia Extrema (720p / 15 FPS)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Console & Diagnostics Log Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeader}>
              <Terminal size={16} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Logs de Operação & Diagnóstico</Text>
            </View>
            <TouchableOpacity
              style={styles.clearLogsBtn}
              onPress={handleClearLogs}
              activeOpacity={0.7}
            >
              <Trash2 size={12} color={theme.colors.textMuted} />
              <Text style={styles.clearLogsText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardSubtitle}>
            Acompanhe a atividade em tempo real. Copie o relatório para suporte ou depuração.
          </Text>

          {/* Copy Report Button */}
          <TouchableOpacity
            style={[styles.copyReportBtn, isCopied && styles.copyReportBtnSuccess]}
            onPress={handleCopyLogs}
            activeOpacity={0.8}
          >
            {isCopied ? (
              <Check size={16} color="#10B981" />
            ) : (
              <Copy size={16} color="#FFFFFF" />
            )}
            <Text style={[styles.copyReportBtnText, isCopied && styles.copyReportBtnTextSuccess]}>
              {isCopied ? "Relatório Copiado com Sucesso!" : "📋 Copiar Logs Completos (Clipboard)"}
            </Text>
          </TouchableOpacity>

          {/* Terminal Box */}
          <ScrollView
            style={styles.terminalBox}
            contentContainerStyle={styles.terminalContent}
            nestedScrollEnabled
          >
            {logs.length === 0 ? (
              <Text style={styles.terminalEmptyText}>• Nenhum log registrado até o momento.</Text>
            ) : (
              logs.map((l, index) => {
                const isErr = l.level === "ERROR";
                const isWarn = l.level === "WARN";
                return (
                  <View key={index} style={styles.logRow}>
                    <Text style={styles.logTime}>[{l.timestamp}]</Text>
                    <Text
                      style={[
                        styles.logLevel,
                        isErr ? styles.logErr : isWarn ? styles.logWarn : styles.logInfo,
                      ]}
                    >
                      [{l.level}]
                    </Text>
                    <Text style={styles.logTag}>[{l.tag}]</Text>
                    <Text style={[styles.logMsg, isErr && styles.logErrMsg]}>
                      {l.message}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Disconnect Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={16} color={theme.colors.danger} />
          <Text style={styles.logoutBtnText}>Desconectar deste Servidor</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.lg,
    gap: 12,
    ...theme.shadows.subtle,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  infoValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  monoValue: {
    ...theme.typography.mono,
    color: theme.colors.accent,
    maxWidth: 190,
  },
  routeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeTagText: {
    ...theme.typography.captionBold,
  },
  lanColor: {
    color: theme.colors.success,
  },
  tsColor: {
    color: theme.colors.tailscale,
  },
  pingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginTop: 4,
  },
  pingBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  pingBadge: {
    ...theme.typography.mono,
    color: theme.colors.success,
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityOptions: {
    gap: 8,
    marginTop: 2,
  },
  qualityBtn: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  activeQualityBtn: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accentBorder,
  },
  qualityBtnText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  activeQualityBtnText: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.dangerMuted,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  logoutBtnText: {
    ...theme.typography.h3,
    color: theme.colors.danger,
  },
  cardHeaderBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearLogsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearLogsText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  copyReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
  copyReportBtnSuccess: {
    backgroundColor: "#064E3B",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  copyReportBtnText: {
    ...theme.typography.bodyBold,
    color: "#FFFFFF",
  },
  copyReportBtnTextSuccess: {
    color: "#10B981",
  },
  terminalBox: {
    height: 180,
    backgroundColor: "#050811",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 10,
    marginTop: 4,
  },
  terminalContent: {
    paddingBottom: 8,
  },
  terminalEmptyText: {
    ...theme.typography.mono,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    paddingVertical: 2,
    gap: 4,
  },
  logTime: {
    ...theme.typography.mono,
    color: "#64748B",
    fontSize: 10,
  },
  logLevel: {
    ...theme.typography.mono,
    fontSize: 10,
    fontWeight: "700",
  },
  logInfo: {
    color: "#38BDF8",
  },
  logWarn: {
    color: "#FBBF24",
  },
  logErr: {
    color: "#EF4444",
  },
  logTag: {
    ...theme.typography.mono,
    color: "#94A3B8",
    fontSize: 10,
  },
  logMsg: {
    ...theme.typography.mono,
    color: "#E2E8F0",
    fontSize: 11,
    flex: 1,
  },
  logErrMsg: {
    color: "#FCA5A5",
  },
});
