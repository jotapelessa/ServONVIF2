import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme/tokens";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = theme.radius.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CameraCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader height={210} borderRadius={theme.radius.lg} />
      <View style={styles.cardMeta}>
        <SkeletonLoader width="60%" height={16} borderRadius={theme.radius.xs} />
        <SkeletonLoader width="35%" height={12} borderRadius={theme.radius.xs} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  cardMeta: {
    padding: theme.spacing.md,
    gap: 6,
  },
});
