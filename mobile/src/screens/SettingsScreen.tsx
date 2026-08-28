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
  Zap,
  Globe,
  RefreshCw,
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
  const [routeMode, setRouteMode] = useState<"AUTO" | "LAN" | "TAILSCALE">("AUTO");
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");

  // Testing states
  const [isTestingLan, setIsTestingLan] = useState(false);
  const [isTestingTs, setIsTestingTs] = useState(false);
  const [lanTestResult, setLanTestResult] = useState<string | null>(null);
  const [tsTestResult, setTsTestResult] = useState<string | null>(null);

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
    setRouteMode(c?.active_mode || "AUTO");
    setRouteType(ApiService.getActiveRouteType());
  };

  const handleSetRouteMode = async (mode: "AUTO" | "LAN" | "TAILSCALE") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setRouteMode(mode);
    await ApiService.setRouteMode(mode);
    await loadSettings();
  };

  const handleSetQuality = async (q: "AUTO" | "HIGH_5MP" | "DATA_SAVER") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setStreamQuality(q);
    await StorageService.setStreamQuality(q);
  };

  const handleTestLan = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsTestingLan(true);
    setLanTestResult(null);
    const res = await ApiService.testLanConnection();
    setIsTestingLan(false);
    setLanTestResult(res.message);
  };

  const handleTestTailscale = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsTestingTs(true);
    setTsTestResult(null);
    const res = await ApiService.testTailscaleConnection();
    setIsTestingTs(false);
    setTsTestResult(res.message);
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
            <Text style={styles.cardTitle}>Conectividade & Roteamento</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispositivo:</Text>
            <Text style={styles.infoValue}>{config?.device_name || "Smartphone"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rota Ativa Agora:</Text>
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
              <Text style={styles.infoLabel}>Tailscale Mesh:</Text>
              <Text style={styles.monoValue} numberOfLines={1}>
                {config.tailscale_url}
              </Text>
            </View>
          )}

          {/* Route Mode Selector */}
          <Text style={[styles.sectionTitle, { marginTop: 14, marginBottom: 8 }]}>
            Modo de Conexão:
          </Text>
          <View style={styles.routeModeRow}>
            <TouchableOpacity
              style={[styles.routeModeBtn, routeMode === "AUTO" && styles.activeRouteModeBtn]}
              onPress={() => handleSetRouteMode("AUTO")}
              activeOpacity={0.7}
            >
              <Zap size={12} color={routeMode === "AUTO" ? "#ffffff" : theme.colors.textMuted} />
              <Text style={[styles.routeModeText, routeMode === "AUTO" && styles.activeRouteModeText]}>
                Auto (Failover)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.routeModeBtn, routeMode === "LAN" && styles.activeRouteModeBtn]}
              onPress={() => handleSetRouteMode("LAN")}
              activeOpacity={0.7}
            >
              <Wifi size={12} color={routeMode === "LAN" ? "#ffffff" : theme.colors.textMuted} />
              <Text style={[styles.routeModeText, routeMode === "LAN" && styles.activeRouteModeText]}>
                Forçar LAN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.routeModeBtn, routeMode === "TAILSCALE" && styles.activeRouteModeBtn]}
              onPress={() => handleSetRouteMode("TAILSCALE")}
              activeOpacity={0.7}
            >
              <Globe size={12} color={routeMode === "TAILSCALE" ? "#ffffff" : theme.colors.textMuted} />
              <Text style={[styles.routeModeText, routeMode === "TAILSCALE" && styles.activeRouteModeText]}>
                Forçar Tailscale
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dedicated Diagnostic Route Testing */}
          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
            🧪 Testes de Rota em Tempo Real:
          </Text>
          
          <View style={styles.testButtonsRow}>
            <TouchableOpacity
              style={styles.testActionBtn}
              onPress={handleTestLan}
              disabled={isTestingLan}
              activeOpacity={0.75}
            >
              {isTestingLan ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Wifi size={14} color="#ffffff" />
                  <Text style={styles.testActionBtnText}>Testar Wi-Fi LAN</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testActionBtn, { backgroundColor: "#0284c7" }]}
              onPress={handleTestTailscale}
              disabled={isTestingTs}
              activeOpacity={0.75}
            >
              {isTestingTs ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Radio size={14} color="#ffffff" />
                  <Text style={styles.testActionBtnText}>Testar Tailscale Mesh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {lanTestResult && (
            <View style={styles.testResultBox}>
              <Text style={styles.testResultText}>{lanTestResult}</Text>
            </View>
          )}

          {tsTestResult && (
            <View style={[styles.testResultBox, { borderColor: "#0284c7" }]}>
              <Text style={styles.testResultText}>{tsTestResult}</Text>
            </View>
          )}
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
                Economia Extrema de Dados (Sub-Stream)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-Time Operational Log Console Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Terminal size={16} color={theme.colors.accent} />
            <Text style={styles.cardTitle}>Console de Logs Operacionais</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Trilha completa de eventos, reconexões e erros em tempo real.
          </Text>

          <View style={styles.logActionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.copyBtn]}
              onPress={handleCopyLogs}
              activeOpacity={0.75}
            >
              {isCopied ? (
                <Check size={14} color="#ffffff" />
              ) : (
                <Copy size={14} color="#ffffff" />
              )}
              <Text style={styles.actionBtnText}>
                {isCopied ? "Copiado!" : "Copiar Logs Completos"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.clearBtn]}
              onPress={handleClearLogs}
              activeOpacity={0.75}
            >
              <Trash2 size={14} color={theme.colors.danger} />
              <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>
                Limpar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terminal Box */}
          <View style={styles.terminalContainer}>
            <ScrollView
              style={styles.terminalScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {logs.length === 0 ? (
                <Text style={styles.terminalEmptyText}>
                  Nenhum log registrado até o momento.
                </Text>
              ) : (
                logs.map((log, index) => {
                  let levelColor = theme.colors.textSecondary;
                  if (log.level === "ERROR") levelColor = theme.colors.danger;
                  if (log.level === "WARN") levelColor = theme.colors.warning;
                  if (log.level === "INFO") levelColor = theme.colors.accent;

                  return (
                    <View key={index} style={styles.logRow}>
                      <Text style={styles.logTime}>[{log.timestamp}]</Text>
                      <Text style={[styles.logLevel, { color: levelColor }]}>
                        [{log.level}]
                      </Text>
                      <Text style={styles.logTag}>[{log.tag}]</Text>
                      <Text style={styles.logMessage}>
                        {log.message}
                        {log.details
                          ? ` | ${
                              typeof log.details === "object"
                                ? JSON.stringify(log.details)
                                : log.details
                            }`
                          : ""}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>

        {/* Disconnect Smartphone Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <LogOut size={16} color={theme.colors.danger} />
          <Text style={styles.logoutBtnText}>Desconectar Smartphone</Text>
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 16,
  },
  sectionTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
  },
  monoValue: {
    ...theme.typography.caption,
    fontFamily: "monospace",
    color: theme.colors.accent,
    maxWidth: 200,
  },
  routeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
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
  routeModeRow: {
    flexDirection: "row",
    gap: 6,
  },
  routeModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeRouteModeBtn: {
    backgroundColor: "#2563eb",
    borderColor: "#3b82f6",
  },
  routeModeText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  activeRouteModeText: {
    color: "#ffffff",
  },
  testButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  testActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#16a34a",
    borderRadius: theme.radius.md,
    ...theme.shadows.subtle,
  },
  testActionBtnText: {
    ...theme.typography.captionBold,
    color: "#ffffff",
  },
  testResultBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  testResultText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontFamily: "monospace",
  },
  qualityOptions: {
    gap: 8,
  },
  qualityBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeQualityBtn: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  qualityBtnText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  activeQualityBtnText: {
    color: theme.colors.accent,
    fontWeight: "bold",
  },
  logActionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
  },
  clearBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  actionBtnText: {
    ...theme.typography.captionBold,
    color: "#ffffff",
  },
  terminalContainer: {
    backgroundColor: "#030712",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    height: 220,
    padding: 8,
  },
  terminalScroll: {
    flex: 1,
  },
  terminalEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.textDisabled,
    fontFamily: "monospace",
    textAlign: "center",
    marginTop: 80,
  },
  logRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
    alignItems: "center",
  },
  logTime: {
    fontSize: 10,
    color: "#6b7280",
    fontFamily: "monospace",
    marginRight: 4,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginRight: 4,
  },
  logTag: {
    fontSize: 10,
    color: "#9ca3af",
    fontFamily: "monospace",
    marginRight: 4,
  },
  logMessage: {
    fontSize: 11,
    color: "#e5e7eb",
    fontFamily: "monospace",
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    marginTop: theme.spacing.sm,
  },
  logoutBtnText: {
    ...theme.typography.bodyBold,
    color: theme.colors.danger,
  },
});
