import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Video, Car, Settings } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../theme/tokens";

export type TabType = "CAMERAS" | "PLATES" | "SETTINGS";

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  plateCountBadge?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  plateCountBadge,
}) => {
  const handleSelectTab = (tab: TabType) => {
    if (tab !== activeTab) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      onTabChange(tab);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Cameras Tab */}
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "CAMERAS" && styles.tabButtonActive]}
        onPress={() => handleSelectTab("CAMERAS")}
        activeOpacity={0.75}
      >
        <Video
          size={19}
          color={activeTab === "CAMERAS" ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "CAMERAS" && styles.tabLabelActive,
          ]}
        >
          Câmeras
        </Text>
      </TouchableOpacity>

      {/* 2. Plates LPR Tab */}
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "PLATES" && styles.tabButtonActive]}
        onPress={() => handleSelectTab("PLATES")}
        activeOpacity={0.75}
      >
        <View style={styles.iconWithBadge}>
          <Car
            size={19}
            color={activeTab === "PLATES" ? theme.colors.accent : theme.colors.textMuted}
          />
          {plateCountBadge !== undefined && plateCountBadge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {plateCountBadge > 99 ? "99+" : plateCountBadge}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeTab === "PLATES" && styles.tabLabelActive,
          ]}
        >
          Placas LPR
        </Text>
      </TouchableOpacity>

      {/* 3. Settings Tab */}
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "SETTINGS" && styles.tabButtonActive]}
        onPress={() => handleSelectTab("SETTINGS")}
        activeOpacity={0.75}
      >
        <Settings
          size={19}
          color={activeTab === "SETTINGS" ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "SETTINGS" && styles.tabLabelActive,
          ]}
        >
          Ajustes
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  tabLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  iconWithBadge: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
  },
});
