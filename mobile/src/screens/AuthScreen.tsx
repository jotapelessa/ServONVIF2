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
  Alert,
} from "react-native";
import { Shield, QrCode, ArrowRight, Server, KeyRound, Sparkles, CheckCircle2 } from "lucide-react-native";
import { ApiService } from "../services/api";
import { PairingBundle } from "../types";

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

  const handlePairFromJson = async () => {
    if (!rawJsonInput.trim()) {
      setErrorMsg("Cole o código QR gerado no painel web ou digite a chave.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      let bundle: PairingBundle;
      if (rawJsonInput.trim().startsWith("{")) {
        bundle = JSON.parse(rawJsonInput);
      } else {
        // Simple token fallback
        bundle = {
          app: "ServONVIF_Mobile",
          token: rawJsonInput.trim(),
          lan_url: "http://192.168.1.96:8080",
          tailscale_url: undefined,
          expires_at: Date.now() + 900000,
        };
      }

      await ApiService.pairDeviceWithBundle(bundle, deviceName);
      onLoginSuccess();
    } catch (e: any) {
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
      onLoginSuccess();
    } catch (e: any) {
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={36} color="#38bdf8" />
          </View>
          <Text style={styles.appName}>ServONVIF Mobile</Text>
          <Text style={styles.appTagline}>
            Acesso ao vivo seguro às suas câmeras 5MP via Tailscale e Wi-Fi
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === "QR_PASTE" && styles.activeTabBtn]}
            onPress={() => {
              setMode("QR_PASTE");
              setErrorMsg(null);
            }}
          >
            <QrCode size={14} color={mode === "QR_PASTE" ? "#ffffff" : "#94a3b8"} />
            <Text style={[styles.tabText, mode === "QR_PASTE" && styles.activeTabText]}>
              QR Code / Token
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === "MANUAL" && styles.activeTabBtn]}
            onPress={() => {
              setMode("MANUAL");
              setErrorMsg(null);
            }}
          >
            <Server size={14} color={mode === "MANUAL" ? "#ffffff" : "#94a3b8"} />
            <Text style={[styles.tabText, mode === "MANUAL" && styles.activeTabText]}>
              IP Manual / Tailscale
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <View style={styles.card}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome deste Smartphone</Text>
            <TextInput
              style={styles.input}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Ex: iPhone 15 ou Moto G54"
              placeholderTextColor="#475569"
            />
          </View>

          {mode === "QR_PASTE" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código QR / Chave de Emparelhamento</Text>
              <Text style={styles.helpText}>
                No computador, acesse Ajustes &gt; Dispositivos &gt; "📱 Emparelhar Smartphone" e cole a chave abaixo:
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={rawJsonInput}
                onChangeText={setRawJsonInput}
                placeholder="Cole o código copiado da tela aqui..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
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
                  placeholder="Ex: 192.168.1.96:8080 ou meu-pc.ts.net:8080"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Token de Acesso / PIN</Text>
                <TextInput
                  style={styles.input}
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholder="Ex: pair_xxxx..."
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={mode === "QR_PASTE" ? handlePairFromJson : handleManualConnect}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Conectar e Autorizar</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tailscale Zero Config Guarantee */}
        <View style={styles.guaranteeBox}>
          <Sparkles size={16} color="#38bdf8" />
          <Text style={styles.guaranteeText}>
            Conexão direta criptografada ponta-a-ponta. Não requer instalação do aplicativo Tailscale no celular.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  scrollContent: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  appName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  appTagline: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#131b2e",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: "#2563eb",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#131b2e",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorBoxText: {
    color: "#f87171",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  helpText: {
    color: "#64748b",
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 14,
  },
  input: {
    backgroundColor: "#090d16",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 13,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(56, 189, 248, 0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
  },
  guaranteeText: {
    color: "#94a3b8",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
