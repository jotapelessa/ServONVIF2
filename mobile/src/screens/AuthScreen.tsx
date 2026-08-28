import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import {
  Shield,
  QrCode,
  ArrowRight,
  Server,
  Sparkles,
  Camera as CameraIcon,
  X,
  Zap,
  ZapOff,
  RefreshCw,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { ApiService } from "../services/api";
import { PairingBundle } from "../types";
import { MobileLogger } from "../services/mobileLogger";
import { theme } from "../theme/tokens";

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<"QR_CAMERA" | "QR_PASTE" | "MANUAL">("QR_CAMERA");
  const [rawJsonInput, setRawJsonInput] = useState("");
  const [serverUrlInput, setServerUrlInput] = useState("192.168.1.96:8080");
  const [tokenInput, setTokenInput] = useState("");
  const [deviceName, setDeviceName] = useState("Meu Smartphone");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // QR Camera Scanner State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(true);

  const handleTabChange = (newMode: "QR_CAMERA" | "QR_PASTE" | "MANUAL") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setMode(newMode);
    setErrorMsg(null);
  };

  const processPairingData = async (dataString: string) => {
    const trimmed = dataString.trim();
    if (!trimmed) {
      setErrorMsg("Nenhum dado recebido do QR Code.");
      return;
    }

    MobileLogger.info("AUTH", `Processando dados de emparelhamento: ${trimmed.slice(0, 40)}...`);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let bundle: PairingBundle;
      if (trimmed.startsWith("{")) {
        bundle = JSON.parse(trimmed);
      } else if (trimmed.includes("pair_")) {
        // Direct pair token
        bundle = {
          app: "ServONVIF_Mobile",
          token: trimmed,
          lan_url: "http://192.168.1.96:8080",
          expires_at: Date.now() + 900000,
        };
      } else {
        throw new Error("Formato do QR Code não reconhecido pelo ServONVIF.");
      }

      await ApiService.pairDeviceWithBundle(bundle, deviceName);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      MobileLogger.info("AUTH", `Emparelhamento concluído com sucesso para ${deviceName}`);
      setIsScannerOpen(false);
      onLoginSuccess();
    } catch (e: any) {
      MobileLogger.error("AUTH", `Falha ao emparelhar: ${e.message}`, e);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMsg(e.message || "Falha ao emparelhar com o servidor ServONVIF.");
    } finally {
      setIsLoading(false);
      setIsScanningActive(true);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanningActive || isLoading) return;
    setIsScanningActive(false);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    processPairingData(data);
  };

  const openCameraScanner = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        setErrorMsg("Permissão de câmera negada. Permita o acesso nas configurações do Android.");
        MobileLogger.warn("AUTH", "Permissão de câmera negada pelo usuário.");
        return;
      }
    }
    setIsScanningActive(true);
    setIsScannerOpen(true);
  };

  const handleManualConnect = async () => {
    let cleanUrl = serverUrlInput.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
    }
    // Auto-append default port 8080 if missing
    if (!cleanUrl.slice(8).includes(":")) {
      cleanUrl = `${cleanUrl}:8080`;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const bundle: PairingBundle = {
      app: "ServONVIF_Mobile",
      token: tokenInput.trim() || "default_pair",
      lan_url: cleanUrl,
      tailscale_url: cleanUrl.includes(".ts.net") ? cleanUrl : undefined,
      expires_at: Date.now() + 900000,
    };

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.pairDeviceWithBundle(bundle, deviceName);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onLoginSuccess();
    } catch (e: any) {
      MobileLogger.error("AUTH", `Erro conexão manual: ${e.message}`, e);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMsg(e.message || "Não foi possível conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Hero */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={36} color={theme.colors.accent} />
          </View>
          <Text style={styles.appName}>ServONVIF Mobile</Text>
          <Text style={styles.appTagline}>
            Acesso ao vivo e inteligente às câmeras 5MP via Tailscale Mesh e Wi-Fi Local.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === "QR_CAMERA" && styles.activeTabBtn]}
            onPress={() => handleTabChange("QR_CAMERA")}
            activeOpacity={0.8}
          >
            <CameraIcon size={14} color={mode === "QR_CAMERA" ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.tabText, mode === "QR_CAMERA" && styles.activeTabText]}>
              Ler QR Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === "QR_PASTE" && styles.activeTabBtn]}
            onPress={() => handleTabChange("QR_PASTE")}
            activeOpacity={0.8}
          >
            <QrCode size={14} color={mode === "QR_PASTE" ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.tabText, mode === "QR_PASTE" && styles.activeTabText]}>
              Colar Chave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === "MANUAL" && styles.activeTabBtn]}
            onPress={() => handleTabChange("MANUAL")}
            activeOpacity={0.8}
          >
            <Server size={14} color={mode === "MANUAL" ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.tabText, mode === "MANUAL" && styles.activeTabText]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Identificação do Smartphone</Text>
            <TextInput
              style={styles.input}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Ex: iPhone 15 ou Moto G54"
              placeholderTextColor={theme.colors.textDisabled}
            />
          </View>

          {mode === "QR_CAMERA" && (
            <View style={styles.cameraActionBox}>
              <Text style={styles.helpText}>
                Aponte a câmera para o QR Code na tela do computador (Ajustes &gt; Dispositivos):
              </Text>
              <TouchableOpacity
                style={styles.scanLauncherBtn}
                onPress={openCameraScanner}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <CameraIcon size={24} color="#ffffff" />
                <Text style={styles.scanLauncherBtnText}>Abrir Leitor de QR Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "QR_PASTE" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chave de Emparelhamento</Text>
              <Text style={styles.helpText}>
                No painel web, acesse Ajustes &gt; Dispositivos &gt; "📱 Emparelhar Smartphone" e cole o código:
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={rawJsonInput}
                onChangeText={setRawJsonInput}
                placeholder="Cole o token ou JSON copiado aqui..."
                placeholderTextColor={theme.colors.textDisabled}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => processPairingData(rawJsonInput)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Conectar e Autorizar</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {mode === "MANUAL" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Endereço do Servidor (LAN ou Tailscale)</Text>
                <TextInput
                  style={styles.input}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="Ex: 192.168.1.96:8080 ou servidor.ts.net:8080"
                  placeholderTextColor={theme.colors.textDisabled}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Token de Autorização</Text>
                <TextInput
                  style={styles.input}
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholder="Ex: pair_xxxx..."
                  placeholderTextColor={theme.colors.textDisabled}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleManualConnect}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Conectar Manualmente</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Security / Tailscale Feature Banner */}
        <View style={styles.guaranteeBox}>
          <Sparkles size={16} color={theme.colors.accent} />
          <Text style={styles.guaranteeText}>
            Túnel criptografado ponto a ponto. Funciona em Wi-Fi local e 4G/5G via Tailscale Mesh.
          </Text>
        </View>
      </ScrollView>

      {/* QR Code Scanner Fullscreen Modal */}
      <Modal
        visible={isScannerOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchEnabled}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={isScanningActive ? handleBarcodeScanned : undefined}
          />

          {/* Scanner Header Controls */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerControlBtn}
              onPress={() => setIsScannerOpen(false)}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>

            <Text style={styles.scannerTitle}>Escanear ServONVIF</Text>

            <TouchableOpacity
              style={styles.scannerControlBtn}
              onPress={() => setTorchEnabled(!torchEnabled)}
            >
              {torchEnabled ? <Zap size={24} color="#f59e0b" /> : <ZapOff size={24} color="#ffffff" />}
            </TouchableOpacity>
          </View>

          {/* Viewfinder Target Box */}
          <View style={styles.viewfinderOverlay}>
            <View style={styles.scanTarget}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerInstructions}>
              Centralize o QR Code gerado no Painel Web
            </Text>
          </View>

          {isLoading && (
            <View style={styles.scannerLoadingOverlay}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.scannerLoadingText}>Validando Servidor...</Text>
            </View>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  appName: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
  },
  appTagline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 290,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
  },
  activeTabBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderHighlight,
  },
  tabText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerMuted,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorBoxText: {
    ...theme.typography.captionBold,
    color: theme.colors.danger,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  helpText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
    marginBottom: theme.spacing.md,
  },
  cameraActionBox: {
    paddingVertical: theme.spacing.sm,
  },
  scanLauncherBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.xs,
    ...theme.shadows.subtle,
  },
  scanLauncherBtnText: {
    color: "#ffffff",
    ...theme.typography.h3,
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  primaryBtnText: {
    color: "#ffffff",
    ...theme.typography.h3,
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.accentMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  guaranteeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  scannerTitle: {
    ...theme.typography.h3,
    color: "#ffffff",
  },
  scannerControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTarget: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#3b82f6",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scannerInstructions: {
    ...theme.typography.captionBold,
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 24,
  },
  scannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scannerLoadingText: {
    ...theme.typography.bodyBold,
    color: "#ffffff",
  },
});
