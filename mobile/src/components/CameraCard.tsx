import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Camera } from "../types";
import { Maximize2, Video, AlertCircle } from "lucide-react-native";

interface CameraCardProps {
  camera: Camera;
  onPress: () => void;
  quality?: "main" | "sub";
}

export const CameraCard: React.FC<CameraCardProps> = ({ camera, onPress, quality = "sub" }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const streamUrl = quality === "main" ? camera.mjpeg_url : (camera.sub_stream_url || camera.mjpeg_url);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      {/* Video Stream Container */}
      <View style={styles.videoContainer}>
        {streamUrl && !hasError ? (
          <Image
            source={{ uri: streamUrl }}
            style={styles.streamImage}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <AlertCircle size={28} color="#ef4444" />
            <Text style={styles.errorText}>Stream Offline</Text>
          </View>
        )}

        {/* Top Badges Bar */}
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

        {/* Fullscreen Overlay Button */}
        <View style={styles.expandIconContainer}>
          <Maximize2 size={14} color="#ffffff" />
        </View>
      </View>

      {/* Camera Meta Bottom Bar */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={styles.camIcon}>
            <Video size={14} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.cameraName} numberOfLines={1}>
              {camera.name}
            </Text>
            <Text style={styles.cameraIp}>{camera.ip_address || "192.168.1.200"}</Text>
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
    backgroundColor: "#131b2e",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  videoContainer: {
    width: "100%",
    height: 200,
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
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
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
    backgroundColor: "rgba(225, 29, 72, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  resolutionText: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "700",
  },
  expandIconContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    padding: 6,
    borderRadius: 8,
  },
  metaRow: {
    paddingHorizontal: 14,
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
  camIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraName: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  cameraIp: {
    color: "#64748b",
    fontSize: 10,
    fontFamily: "monospace",
    marginTop: 1,
  },
  fpsBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fpsText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "800",
  },
});
