import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Camera } from "../types";
import { ArrowLeft, Camera as CameraIcon, Sparkles, Radio, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

interface SpotlightScreenProps {
  camera: Camera;
  onClose: () => void;
}

export const SpotlightScreen: React.FC<SpotlightScreenProps> = ({ camera, onClose }) => {
  const [qualityMode, setQualityMode] = useState<"5MP_MAIN" | "SUB">("5MP_MAIN");
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const activeStreamUrl =
    qualityMode === "5MP_MAIN" ? camera.mjpeg_url : (camera.sub_stream_url || camera.mjpeg_url);

  const handleQualityToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setQualityMode(qualityMode === "5MP_MAIN" ? "SUB" : "5MP_MAIN");
  };

  const handleTakeSnapshot = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setFlashActive(true);
    setIsSnapshotting(true);
    setTimeout(() => setFlashActive(false), 150);
    setTimeout(() => {
      setIsSnapshotting(false);
      Alert.alert("Foto Salva", "Snapshot da câmera em 5MP capturado com sucesso!");
    }, 400);
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Cinema Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {camera.name}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <View style={styles.livePulse} />
            <Text style={styles.headerSubtitle}>
              {qualityMode === "5MP_MAIN" ? "Sensor 5MP Nativo (2880x1620)" : "Sub-Stream Fluido (720p)"}
            </Text>
          </View>
        </View>

        {/* Quality Switch Pill */}
        <TouchableOpacity
          style={[styles.qualityToggle, qualityMode === "5MP_MAIN" ? styles.quality5MP : styles.qualitySub]}
          onPress={handleQualityToggle}
          activeOpacity={0.8}
        >
          <Sparkles size={12} color={qualityMode === "5MP_MAIN" ? theme.colors.accent : theme.colors.textMuted} />
          <Text style={[styles.qualityText, qualityMode === "5MP_MAIN" ? styles.qualityText5MP : styles.qualityTextSub]}>
            {qualityMode === "5MP_MAIN" ? "5MP HD" : "SUB"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Viewport */}
      <View style={styles.streamWrapper}>
        {activeStreamUrl && (
          <Image
            source={{ uri: activeStreamUrl }}
            style={styles.streamImage}
            resizeMode="contain"
          />
        )}

        {flashActive && <View style={styles.flashOverlay} />}
      </View>

      {/* Floating Control Toolbar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, isSnapshotting && styles.actionBtnSuccess]}
          onPress={handleTakeSnapshot}
          activeOpacity={0.8}
        >
          {isSnapshotting ? (
            <Check size={18} color="#ffffff" />
          ) : (
            <CameraIcon size={18} color="#ffffff" />
          )}
          <Text style={styles.actionBtnText}>
            {isSnapshotting ? "Capturado!" : "Capturar Foto 5MP"}
          </Text>
        </TouchableOpacity>

        <View style={styles.telemetryPill}>
          <Radio size={14} color={theme.colors.success} />
          <Text style={styles.telemetryText}>25 FPS Estável • &lt;120ms Latência</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: "rgba(13, 20, 36, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMeta: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  qualityToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  quality5MP: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accentBorder,
  },
  qualitySub: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderSubtle,
  },
  qualityText: {
    ...theme.typography.captionBold,
  },
  qualityText5MP: {
    color: theme.colors.accent,
  },
  qualityTextSub: {
    color: theme.colors.textMuted,
  },
  streamWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    position: "relative",
  },
  streamImage: {
    width: "100%",
    height: "100%",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    opacity: 0.85,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: "rgba(13, 20, 36, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
  },
  actionBtnSuccess: {
    backgroundColor: theme.colors.success,
  },
  actionBtnText: {
    color: "#ffffff",
    ...theme.typography.captionBold,
  },
  telemetryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.successMuted,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  telemetryText: {
    ...theme.typography.mono,
    color: theme.colors.success,
  },
});
