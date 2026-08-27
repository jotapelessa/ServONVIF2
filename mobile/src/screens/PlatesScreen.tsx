import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { PlateLog } from "../types";
import { ApiService } from "../services/api";
import { Header } from "../components/Header";
import { Car, Search, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react-native";

export const PlatesScreen: React.FC = () => {
  const [logs, setLogs] = useState<PlateLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [routeType, setRouteType] = useState<"LAN" | "TAILSCALE">("LAN");

  const loadLogs = useCallback(async () => {
    try {
      const data = await ApiService.getPlateLogs(50);
      setLogs(data);
      setRouteType(ApiService.getActiveRouteType());
    } catch (e) {
      console.error("Failed to load plate logs:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLogs();
  };

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      l.plate_number.toLowerCase().includes(term) ||
      (l.owner_name && l.owner_name.toLowerCase().includes(term)) ||
      (l.vehicle_model && l.vehicle_model.toLowerCase().includes(term))
    );
  });

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case "MORADOR":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
          text: "#34d399",
          label: "Morador",
        };
      case "VISITANTE":
        return {
          bg: "rgba(56, 189, 248, 0.12)",
          border: "rgba(56, 189, 248, 0.3)",
          text: "#38bdf8",
          label: "Visitante",
        };
      case "SUSPEITO":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.3)",
          text: "#f87171",
          label: "Suspeito",
        };
      default:
        return {
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
          text: "#94a3b8",
          label: "Identificado",
        };
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Reconhecimento de Placas (LPR)"
        routeType={routeType}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa, morador ou modelo..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="characters"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Carregando histórico LPR...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
            />
          }
          renderItem={({ item }) => {
            const badge = getCategoryBadge(item.category);
            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.plateTag}>
                    <Text style={styles.plateText}>{item.plate_number}</Text>
                  </View>

                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: badge.bg, borderColor: badge.border },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.logMeta}>
                  <Text style={styles.ownerText}>
                    {item.owner_name ? `${item.owner_name} • ` : ""}
                    {item.vehicle_model || "Veículo Detectado"}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(item.timestamp).toLocaleString("pt-BR")}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Car size={44} color="#475569" />
              <Text style={styles.emptyTitle}>Nenhuma placa detectada</Text>
              <Text style={styles.emptySubtitle}>
                Quando um veículo passar pela câmera da garagem, as placas aparecerão aqui em tempo real.
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0d1322",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 12,
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
  logCard: {
    backgroundColor: "#131b2e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plateTag: {
    backgroundColor: "#000000",
    borderWidth: 1.5,
    borderColor: "#38bdf8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
  },
  logMeta: {
    marginTop: 10,
    gap: 2,
  },
  ownerText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    color: "#64748b",
    fontSize: 10,
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
    maxWidth: 280,
  },
});
