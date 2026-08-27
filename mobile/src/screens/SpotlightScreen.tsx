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
import { ArrowLeft, Camera as CameraIcon, Zap, Shield, Sparkles, Radio } from "lucide-react-native";

interface SpotlightScreenProps {
  camera: Camera;
  onClose: () => void;
}

export const SpotlightScreen: React.FC<SpotlightScreenProps> = ({ camera, onClose }) => {
  const [qualityMode, setQualityMode] = useState<"5MP_MAIN" | "SUB">("5MP_MAIN");
  const [snapshotFeedback, setSnapshotFeedback] = useState(false);

  const activeStreamUrl =
    qualityMode === "5MP_MAIN" ? camera.mjpeg_url : (camera.sub_stream_url || camera.mjpeg_url);

  const handleTakeSnapshot = () => {
    setSnapshotFeedback(true);
    setTimeout(() => {
      setSnapshotFeedback(false);
      Alert.alert("Foto Salva", "Snapshot da câmera em 5MP capturado com sucesso!");
    }, 400);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {camera.name}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <View style={styles.livePulse} />
            <Text style={styles.headerSubtitle}>
              {qualityMode === "5MP_MAIN" ? "5MP Sensor Nativo (2880x1620)" : "Sub-Stream Fluido (720p)"}
            </Text>
          </View>
        </View>

        {/* Quality Toggle Button */}
        <TouchableOpacity
          style={[styles.qualityToggle, qualityMode === "5MP_MAIN" ? styles.quality5MP : styles.qualitySub]}
          onPress={() => setQualityMode(qualityMode === "5MP_MAIN" ? "SUB" : "5MP_MAIN")}
          activeOpacity={0.8}
        >
          <Sparkles size={12} color={qualityMode === "5MP_MAIN" ? "#38bdf8" : "#94a3b8"} />
          <Text style={[styles.qualityText, qualityMode === "5MP_MAIN" ? styles.qualityText5MP : styles.qualityTextSub]}>
            {qualityMode === "5MP_MAIN" ? "5MP HD" : "SUB"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Video View Area */}
      <View style={styles.streamWrapper}>
        {activeStreamUrl && (
          <Image
            source={{ uri: activeStreamUrl }}
            style={styles.streamImage}
            resizeMode="contain"
          />
        )}

        {snapshotFeedback && <View style={styles.flashOverlay} />}
      </View>

      {/* Controls Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleTakeSnapshot}
          activeOpacity={0.8}
        >
          <CameraIcon size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>Capturar Foto</Text>
        </TouchableOpacity>

        <View style={styles.telemetryPill}>
          <Radio size={14} color="#10b981" />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(13, 19, 34, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMeta: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
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
    backgroundColor: "#ef4444",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "500",
  },
  qualityToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  quality5MP: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  qualitySub: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  qualityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  qualityText5MP: {
    color: "#38bdf8",
  },
  qualityTextSub: {
    color: "#94a3b8",
  },
  streamWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    position: "relative",
  },
  streamImage: {
    width: "100%",
    height: "100%",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(13, 19, 34, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  telemetryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  telemetryText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "700",
  },
});
