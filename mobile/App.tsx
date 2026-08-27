import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { Video, Car, Settings } from "lucide-react-native";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"CAMERAS" | "PLATES" | "SETTINGS">("CAMERAS");
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
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.splashText}>Iniciando ServONVIF Mobile...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <AuthScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1322" />

      {/* Main Screen Content */}
      <View style={styles.content}>
        {activeTab === "CAMERAS" && (
          <HomeScreen onSelectCamera={(cam) => setSpotlightCamera(cam)} />
        )}
        {activeTab === "PLATES" && <PlatesScreen />}
        {activeTab === "SETTINGS" && (
          <SettingsScreen onLogout={() => setIsAuthenticated(false)} />
        )}
      </View>

      {/* 5MP Fullscreen Spotlight Modal */}
      {spotlightCamera && (
        <View style={styles.spotlightWrapper}>
          <SpotlightScreen
            camera={spotlightCamera}
            onClose={() => setSpotlightCamera(null)}
          />
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("CAMERAS")}
          activeOpacity={0.7}
        >
          <Video
            size={20}
            color={activeTab === "CAMERAS" ? "#38bdf8" : "#64748b"}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "CAMERAS" && styles.activeNavText,
            ]}
          >
            Câmeras
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("PLATES")}
          activeOpacity={0.7}
        >
          <Car
            size={20}
            color={activeTab === "PLATES" ? "#38bdf8" : "#64748b"}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "PLATES" && styles.activeNavText,
            ]}
          >
            Placas LPR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("SETTINGS")}
          activeOpacity={0.7}
        >
          <Settings
            size={20}
            color={activeTab === "SETTINGS" ? "#38bdf8" : "#64748b"}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "SETTINGS" && styles.activeNavText,
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#090d16",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  splashText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  spotlightWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#0d1322",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingVertical: 8,
    paddingBottom: 14,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },
  activeNavText: {
    color: "#38bdf8",
    fontWeight: "700",
  },
});
