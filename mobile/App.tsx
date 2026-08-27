import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Camera } from "./src/types";
import { StorageService } from "./src/services/storage";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SpotlightScreen } from "./src/screens/SpotlightScreen";
import { PlatesScreen } from "./src/screens/PlatesScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { BottomNavBar, TabType } from "./src/components/BottomNavBar";
import { theme } from "./src/theme/tokens";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("CAMERAS");
  const [spotlightCamera, setSpotlightCamera] = useState<Camera | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const config = await StorageService.getConnectionConfig();
    setIsAuthenticated(!!config);
  };

  if (isAuthenticated === null) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.splashText}>Iniciando ServONVIF Mobile...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <AuthScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />

      {/* Main Active Tab Screen View */}
      <View style={styles.content}>
        {activeTab === "CAMERAS" && (
          <HomeScreen onSelectCamera={(cam) => setSpotlightCamera(cam)} />
        )}
        {activeTab === "PLATES" && <PlatesScreen />}
        {activeTab === "SETTINGS" && (
          <SettingsScreen onLogout={() => setIsAuthenticated(false)} />
        )}
      </View>

      {/* 5MP Fullscreen Spotlight Modal Overlay */}
      {spotlightCamera && (
        <View style={styles.spotlightWrapper}>
          <SpotlightScreen
            camera={spotlightCamera}
            onClose={() => setSpotlightCamera(null)}
          />
        </View>
      )}

      {/* Bottom Navigation Dock */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  splashText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  content: {
    flex: 1,
  },
  spotlightWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
