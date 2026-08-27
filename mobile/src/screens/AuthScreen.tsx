import React, { useState } from "react";
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
} from "react-native";
import { Shield, QrCode, ArrowRight, Server, Sparkles, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ApiService } from "../services/api";
import { PairingBundle } from "../types";
import { theme } from "../theme/tokens";

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<"QR_PASTE" | "MANUAL">("QR_PASTE");
  const [rawJsonInput, setRawJsonInput] = useState("");
  const [serverUrlInput, setServerUrlInput] = useState("192.168.1.96:8080");
  const [tokenInput, setTokenInput] = useState("");
  const [deviceName, setDeviceName] = useState("Meu Smartphone");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTabChange = (newMode: "QR_PASTE" | "MANUAL") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setMode(newMode);
    setErrorMsg(null);
  };

  const handlePairFromJson = async () => {
    if (!rawJsonInput.trim()) {
      setErrorMsg("Cole a chave ou o código do QR Code gerado no painel web.");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsLoading(true);
    setErrorMsg(null);
    try {
      let bundle: PairingBundle;
      if (rawJsonInput.trim().startsWith("{")) {
        bundle = JSON.parse(rawJsonInput);
      } else {
        bundle = {
          app: "ServONVIF_Mobile",
          token: rawJsonInput.trim(),
          lan_url: "http://192.168.1.96:8080",
          tailscale_url: undefined,
          expires_at: Date.now() + 900000,
        };
      }

      await ApiService.pairDeviceWithBundle(bundle, deviceName);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onLoginSuccess();
    } catch (e: any) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMsg(e.message || "Falha ao emparelhar com o servidor ServONVIF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = async () => {
    let cleanUrl = serverUrlInput.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
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
            <Shield size={34} color={theme.colors.accent} />
          </View>
          <Text style={styles.appName}>ServONVIF Mobile</Text>
          <Text style={styles.appTagline}>
            Acesso ao vivo e inteligente às suas câmeras 5MP via Tailscale Mesh e Wi-Fi Local.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === "QR_PASTE" && styles.activeTabBtn]}
            onPress={() => handleTabChange("QR_PASTE")}
            activeOpacity={0.8}
          >
            <QrCode size={14} color={mode === "QR_PASTE" ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.tabText, mode === "QR_PASTE" && styles.activeTabText]}>
              QR Code / Chave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === "MANUAL" && styles.activeTabBtn]}
            onPress={() => handleTabChange("MANUAL")}
            activeOpacity={0.8}
          >
            <Server size={14} color={mode === "MANUAL" ? theme.colors.textPrimary : theme.colors.textMuted} />
            <Text style={[styles.tabText, mode === "MANUAL" && styles.activeTabText]}>
              Endereço Manual
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

          {mode === "QR_PASTE" ? (
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
            </View>
          ) : (
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
            </>
          )}

          {/* Connect Action Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={mode === "QR_PASTE" ? handlePairFromJson : handleManualConnect}
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

        {/* Security / Tailscale Feature Banner */}
        <View style={styles.guaranteeBox}>
          <Sparkles size={16} color={theme.colors.accent} />
          <Text style={styles.guaranteeText}>
            Túnel criptografado ponto a ponto. Dispensa a instalação do aplicativo oficial do Tailscale no celular.
          </Text>
        </View>
      </ScrollView>
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
    width: 64,
    height: 64,
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
    marginBottom: 8,
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
    height: 80,
    textAlignVertical: "top",
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
});
