import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Camera } from "../types";
import { ApiService } from "../services/api";
import { CameraCard } from "../components/CameraCard";
import { CameraCardSkeleton } from "../components/SkeletonLoader";
import { Header } from "../components/Header";
import { Video, Sparkles, Filter, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

interface HomeScreenProps {
  onSelectCamera: (camera: Camera) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectCamera }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");
  const [filterMode, setFilterMode] = useState<"ALL" | "ONLINE">("ALL");

  const loadCameras = useCallback(async () => {
    try {
      const data = await ApiService.getCameras();
      setCameras(data);
      setRouteType(ApiService.getActiveRouteType());
      MobileLogger.info("CAMERAS", `Carregadas ${data.length} câmeras com sucesso. Rota: ${ApiService.getActiveRouteType()}`);
    } catch (e: any) {
      MobileLogger.error("CAMERAS", `Falha ao listar câmeras: ${e.message}`, e);
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsRefreshing(true);
    await ApiService.refreshRoute();
    await loadCameras();
  };

  const handleQuickSnapshotSuccess = (cameraName: string) => {
    Alert.alert("Snapshot Salvo", `Foto de '${cameraName}' em 5MP capturada com sucesso!`);
  };

  const filteredCameras = cameras.filter((c) => {
    if (filterMode === "ONLINE") return c.is_active;
    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Câmeras Conectadas"
        routeType={routeType}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Filter Tabs Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filterMode === "ALL" && styles.activeFilterChip]}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setFilterMode("ALL");
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filterMode === "ALL" && styles.activeFilterText]}>
            Todas ({cameras.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterMode === "ONLINE" && styles.activeFilterChip]}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setFilterMode("ONLINE");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.greenDot} />
          <Text style={[styles.filterText, filterMode === "ONLINE" && styles.activeFilterText]}>
            Online ({cameras.filter((c) => c.is_active).length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <CameraCardSkeleton />
          <CameraCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredCameras}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
          ListHeaderComponent={
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryNumber}>{cameras.length}</Text>
                <Text style={styles.telemetryLabel}>Total Câmeras</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryNumber}>5MP Nativo</Text>
                <Text style={styles.telemetryLabel}>2880x1620 HD</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={[styles.telemetryNumber, { color: theme.colors.success }]}>25 FPS</Text>
                <Text style={styles.telemetryLabel}>Fluidez Máxima</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <CameraCard
              camera={item}
              onPress={() => onSelectCamera(item)}
              onQuickSnapshot={() => handleQuickSnapshotSuccess(item.name)}
              quality="sub"
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyTitle}>Nenhuma câmera encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Verifique se as câmeras estão ligadas e se o servidor ServONVIF está ativo.
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
    backgroundColor: theme.colors.background,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accentBorder,
  },
  filterText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  activeFilterText: {
    color: theme.colors.accent,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  telemetryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  telemetryItem: {
    alignItems: "center",
  },
  telemetryNumber: {
    ...theme.typography.h3,
    color: theme.colors.accent,
  },
  telemetryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderSubtle,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 270,
  },
});
