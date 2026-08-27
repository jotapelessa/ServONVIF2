import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Camera } from "../types";
import { Maximize2, Video, AlertCircle, Camera as CameraIcon, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

interface CameraCardProps {
  camera: Camera;
  onPress: () => void;
  onQuickSnapshot?: () => void;
  quality?: "main" | "sub";
}

export const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  onPress,
  onQuickSnapshot,
  quality = "sub",
}) => {
  const [hasError, setHasError] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const streamUrl =
    quality === "main" ? camera.mjpeg_url : (camera.sub_stream_url || camera.mjpeg_url);

  const handleCardPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPress();
  };

  const handleSnapshotPress = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    setIsSnapshotting(true);
    setTimeout(() => setIsSnapshotting(false), 1200);
    if (onQuickSnapshot) onQuickSnapshot();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={handleCardPress}
    >
      {/* 16:9 Video Stream Viewport */}
      <View style={styles.videoContainer}>
        {streamUrl && !hasError ? (
          <Image
            source={{ uri: streamUrl }}
            style={styles.streamImage}
            resizeMode="cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <View style={styles.errorContainer}>
            <AlertCircle size={28} color={theme.colors.danger} />
            <Text style={styles.errorText}>Stream Offline</Text>
          </View>
        )}

        {/* Top Badges Overlay */}
        <View style={styles.topBadges}>
          <View style={styles.liveBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>

          <View style={styles.resolutionBadge}>
            <Text style={styles.resolutionText}>
              {camera.width && camera.height ? `${camera.width}x${camera.height}` : "5MP HD"}
            </Text>
          </View>
        </View>

        {/* Floating Quick Action Buttons */}
        <View style={styles.bottomOverlayActions}>
          <TouchableOpacity
            style={[styles.actionIconBtn, isSnapshotting && styles.actionIconBtnSuccess]}
            onPress={handleSnapshotPress}
            activeOpacity={0.7}
          >
            {isSnapshotting ? (
              <Check size={14} color={theme.colors.success} />
            ) : (
              <CameraIcon size={14} color="#ffffff" />
            )}
          </TouchableOpacity>

          <View style={styles.expandPill}>
            <Maximize2 size={13} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* Meta Footer */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={styles.camIconWrapper}>
            <Video size={14} color={theme.colors.accent} />
          </View>
          <View style={styles.metaTexts}>
            <Text style={styles.cameraName} numberOfLines={1}>
              {camera.name}
            </Text>
            <Text style={styles.cameraIp} numberOfLines={1}>
              {camera.ip_address || "192.168.1.200"} • RTSP H.264
            </Text>
          </View>
        </View>

        <View style={styles.fpsBadge}>
          <Text style={styles.fpsText}>{camera.fps || 25} FPS</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#020617",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  streamImage: {
    width: "100%",
    height: "100%",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  topBadges: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: theme.radius.xs,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  liveText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resolutionBadge: {
    backgroundColor: "rgba(13, 20, 36, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  resolutionText: {
    ...theme.typography.mono,
    color: theme.colors.textPrimary,
  },
  bottomOverlayActions: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionIconBtn: {
    backgroundColor: "rgba(7, 11, 20, 0.75)",
    padding: 7,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionIconBtnSuccess: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.successBorder,
  },
  expandPill: {
    backgroundColor: "rgba(7, 11, 20, 0.75)",
    padding: 7,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  metaRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  camIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  metaTexts: {
    flex: 1,
  },
  cameraName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  cameraIp: {
    ...theme.typography.mono,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  fpsBadge: {
    backgroundColor: theme.colors.successMuted,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.xs,
  },
  fpsText: {
    ...theme.typography.mono,
    color: theme.colors.success,
  },
});
