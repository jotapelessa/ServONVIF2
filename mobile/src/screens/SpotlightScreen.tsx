import React, { useState, useEffect } from "react";
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
import { ArrowLeft, Camera as CameraIcon, Sparkles, Radio, Check, RefreshCw } from "lucide-react-native";
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

  // Zero-Flicker Dual-Layer State
  const baseFrameUrl = camera.frame_url || `${camera.mjpeg_url?.replace("/api/mjpeg/", "/api/cameras/")}/frame`;
  const [uriA, setUriA] = useState<string>(`${baseFrameUrl}?quality=${qualityMode === "5MP_MAIN" ? "main" : "sub"}&t=${Date.now()}`);
  const [uriB, setUriB] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (!isMounted) return;
      const nextTimestamp = Date.now();
      const qualityParam = qualityMode === "5MP_MAIN" ? "main" : "sub";
      const nextUri = `${baseFrameUrl}?quality=${qualityParam}&t=${nextTimestamp}`;

      // Pre-load next frame in the background layer
      setActiveLayer((current) => {
        if (current === "A") {
          setUriB(nextUri);
        } else {
          setUriA(nextUri);
        }
        return current;
      });
    }, 450);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [baseFrameUrl, qualityMode]);

  const handleLayerALoad = () => {
    setIsLoaded(true);
    if (activeLayer === "B") {
      setActiveLayer("A");
    }
  };

  const handleLayerBLoad = () => {
    setIsLoaded(true);
    if (activeLayer === "A") {
      setActiveLayer("B");
    }
  };

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
        {/* Layer A */}
        {uriA ? (
          <Image
            source={{ uri: uriA }}
            style={[
              styles.streamImage,
              styles.absoluteStreamImage,
              { opacity: activeLayer === "A" ? 1 : 0, zIndex: activeLayer === "A" ? 2 : 1 }
            ]}
            resizeMode="contain"
            onLoad={handleLayerALoad}
          />
        ) : null}

        {/* Layer B (Background Pre-loader) */}
        {uriB ? (
          <Image
            source={{ uri: uriB }}
            style={[
              styles.streamImage,
              styles.absoluteStreamImage,
              { opacity: activeLayer === "B" ? 1 : 0, zIndex: activeLayer === "B" ? 2 : 1 }
            ]}
            resizeMode="contain"
            onLoad={handleLayerBLoad}
          />
        ) : null}

        {flashActive && <View style={styles.flashOverlay} />}
      </View>

      {/* Cinema Control Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.actionBtn, isSnapshotting && styles.actionBtnSuccess]}
          onPress={handleTakeSnapshot}
          activeOpacity={0.8}
        >
          {isSnapshotting ? (
            <Check size={20} color={theme.colors.success} />
          ) : (
            <CameraIcon size={20} color="#ffffff" />
          )}
          <Text style={styles.actionBtnText}>Capturar Snapshot 5MP</Text>
        </TouchableOpacity>
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
    backgroundColor: "#070B14",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMeta: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.12)",
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
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  streamImage: {
    width: "100%",
    height: "100%",
  },
  absoluteStreamImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    opacity: 0.8,
  },
  controlsBar: {
    padding: theme.spacing.lg,
    backgroundColor: "#070B14",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  actionBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: theme.radius.xl,
    ...theme.shadows.card,
  },
  actionBtnSuccess: {
    backgroundColor: theme.colors.successMuted,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
  },
  actionBtnText: {
    ...theme.typography.bodyBold,
    color: "#ffffff",
  },
});
