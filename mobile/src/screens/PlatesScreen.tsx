import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { PlateLog } from "../types";
import { ApiService } from "../services/api";
import { Header } from "../components/Header";
import { Car, Search, X, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

export const PlatesScreen: React.FC = () => {
  const [logs, setLogs] = useState<PlateLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "MORADOR" | "VISITANTE" | "SUSPEITO">("ALL");
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsRefreshing(true);
    await loadLogs();
  };

  const handleCategoryChange = (cat: "ALL" | "MORADOR" | "VISITANTE" | "SUSPEITO") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFilterCategory(cat);
  };

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      l.plate_number.toLowerCase().includes(term) ||
      (l.owner_name && l.owner_name.toLowerCase().includes(term)) ||
      (l.vehicle_model && l.vehicle_model.toLowerCase().includes(term));

    const matchesCategory =
      filterCategory === "ALL" ||
      (l.category && l.category.toUpperCase() === filterCategory);

    return matchesSearch && matchesCategory;
  });

  const getCategoryMeta = (category?: string) => {
    switch (category?.toUpperCase()) {
      case "MORADOR":
        return {
          bg: theme.colors.successMuted,
          border: theme.colors.successBorder,
          text: theme.colors.success,
          label: "Morador",
        };
      case "VISITANTE":
        return {
          bg: theme.colors.accentMuted,
          border: theme.colors.accentBorder,
          text: theme.colors.accent,
          label: "Visitante",
        };
      case "SUSPEITO":
        return {
          bg: theme.colors.dangerMuted,
          border: theme.colors.dangerBorder,
          text: theme.colors.danger,
          label: "Suspeito",
        };
      default:
        return {
          bg: theme.colors.warningMuted,
          border: theme.colors.warningBorder,
          text: theme.colors.warning,
          label: "Identificado",
        };
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Reconhecimento LPR"
        routeType={routeType}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa, morador ou modelo..."
            placeholderTextColor={theme.colors.textDisabled}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="characters"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills Bar */}
        <View style={styles.categoryPills}>
          {(["ALL", "MORADOR", "VISITANTE", "SUSPEITO"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                filterCategory === cat && styles.activeCategoryChip,
              ]}
              onPress={() => handleCategoryChange(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  filterCategory === cat && styles.activeCategoryChipText,
                ]}
              >
                {cat === "ALL"
                  ? "Todas"
                  : cat === "MORADOR"
                  ? "Moradores"
                  : cat === "VISITANTE"
                  ? "Visitantes"
                  : "Suspeitos"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando registros LPR...</Text>
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
              tintColor={theme.colors.accent}
            />
          }
          renderItem={({ item }) => {
            const meta = getCategoryMeta(item.category);
            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  {/* Mercosul Plate Container */}
                  <View style={styles.plateTag}>
                    <View style={styles.mercosulBlueHeader}>
                      <Text style={styles.mercosulCountry}>BRASIL</Text>
                    </View>
                    <Text style={styles.plateNumberText}>{item.plate_number}</Text>
                  </View>

                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: meta.bg, borderColor: meta.border },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: meta.text }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.logDetails}>
                  <Text style={styles.ownerText}>
                    {item.owner_name ? `${item.owner_name} • ` : ""}
                    {item.vehicle_model || "Veículo na Garagem"}
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
              <Car size={44} color={theme.colors.textDisabled} />
              <Text style={styles.emptyTitle}>Nenhuma placa encontrada</Text>
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
    backgroundColor: theme.colors.background,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    gap: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },
  categoryPills: {
    flexDirection: "row",
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  activeCategoryChip: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accentBorder,
  },
  categoryChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  activeCategoryChipText: {
    color: theme.colors.accent,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  logCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plateTag: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#003399",
    borderRadius: 5,
    width: 105,
    overflow: "hidden",
    alignItems: "center",
  },
  mercosulBlueHeader: {
    backgroundColor: "#003399",
    width: "100%",
    alignItems: "center",
    paddingVertical: 1,
  },
  mercosulCountry: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  plateNumberText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "monospace",
    paddingVertical: 1,
  },
  categoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
  },
  categoryText: {
    ...theme.typography.captionBold,
  },
  logDetails: {
    marginTop: 10,
    gap: 2,
  },
  ownerText: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
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
    maxWidth: 280,
  },
});
