import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Shield, Wifi, Radio, RefreshCw } from "lucide-react-native";

interface HeaderProps {
  title: string;
  routeType: "LAN" | "TAILSCALE";
  serverName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  routeType,
  serverName = "ServONVIF Hub",
  onRefresh,
  isRefreshing = false,
}) => {
  const isLan = routeType === "LAN";

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.logoBadge}>
          <Shield size={18} color="#38bdf8" />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{serverName}</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <View style={[styles.routeBadge, isLan ? styles.lanBadge : styles.tailscaleBadge]}>
          {isLan ? (
            <Wifi size={12} color="#10b981" />
          ) : (
            <Radio size={12} color="#06b6d4" />
          )}
          <Text style={[styles.routeText, isLan ? styles.lanText : styles.tailscaleText]}>
            {isLan ? "Wi-Fi Local" : "Tailscale 4G"}
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1322",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  lanBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  tailscaleBadge: {
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  routeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  lanText: {
    color: "#34d399",
  },
  tailscaleText: {
    color: "#22d3ee",
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
});
