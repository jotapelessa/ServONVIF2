import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Camera } from "../types";
import { ApiService } from "../services/api";
import { CameraCard } from "../components/CameraCard";
import { Header } from "../components/Header";
import { Video, ShieldAlert, Sparkles } from "lucide-react-native";

interface HomeScreenProps {
  onSelectCamera: (camera: Camera) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectCamera }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");

  const loadCameras = useCallback(async () => {
    try {
      const data = await ApiService.getCameras();
      setCameras(data);
      setRouteType(ApiService.getActiveRouteType());
    } catch (e) {
      console.error("Failed to load cameras:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
    const interval = setInterval(async () => {
      await ApiService.sendDevicePing();
    }, 25000);
    return () => clearInterval(interval);
  }, [loadCameras]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await ApiService.refreshRoute();
    await loadCameras();
  };

  return (
    <View style={styles.container}>
      <Header
        title="Câmeras Conectadas"
        routeType={routeType}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Conectando às câmeras ONVIF 5MP...</Text>
        </View>
      ) : (
        <FlatList
          data={cameras}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
              colors={["#38bdf8"]}
            />
          }
          ListHeaderComponent={
            <View style={styles.statsBanner}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{cameras.length}</Text>
                <Text style={styles.statLabel}>Câmeras Online</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5MP</Text>
                <Text style={styles.statLabel}>Sensor Nativo</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>25 FPS</Text>
                <Text style={styles.statLabel}>Taxa de Quadros</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <CameraCard
              camera={item}
              onPress={() => onSelectCamera(item)}
              quality="sub"
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video size={48} color="#475569" />
              <Text style={styles.emptyTitle}>Nenhuma câmera encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Verifique se o servidor ServONVIF está ativo e conectado à rede.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  statsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#131b2e",
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1e293b",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
});
