import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Shield, Wifi, Radio, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

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

  const handleRefreshPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onRefresh) onRefresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.logoBadge}>
          <Shield size={18} color={theme.colors.accent} />
        </View>
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {serverName}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <View
          style={[
            styles.routeBadge,
            isLan ? styles.lanBadge : styles.tailscaleBadge,
          ]}
        >
          {isLan ? (
            <Wifi size={12} color={theme.colors.success} />
          ) : (
            <Radio size={12} color={theme.colors.tailscale} />
          )}
          <Text
            style={[
              styles.routeText,
              isLan ? styles.lanText : styles.tailscaleText,
            ]}
          >
            {isLan ? "Wi-Fi Local" : "Tailscale Mesh"}
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefreshPress}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw
              size={14}
              color={theme.colors.textSecondary}
              style={isRefreshing ? styles.spinning : undefined}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  lanBadge: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.successBorder,
  },
  tailscaleBadge: {
    backgroundColor: theme.colors.tailscaleMuted,
    borderColor: theme.colors.tailscaleBorder,
  },
  routeText: {
    ...theme.typography.captionBold,
  },
  lanText: {
    color: theme.colors.success,
  },
  tailscaleText: {
    color: theme.colors.tailscale,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  spinning: {
    opacity: 0.6,
  },
});
