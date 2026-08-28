/**
 * ServONVIF Mobile - Unified Design Tokens (Rule 60/30/10)
 */

export const theme = {
  colors: {
    // 60% - Neutral Deep Background & Surfaces
    background: "#070b14",
    surface: "#0d1424",
    surfaceElevated: "#131d33",
    surfaceHover: "#182542",
    surfaceOverlay: "rgba(7, 11, 20, 0.88)",

    // 30% - Borders, Dividers & Structural Content
    border: "#1c2b48",
    borderSubtle: "#152238",
    borderHighlight: "#2d4370",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    textDisabled: "#475569",

    // 10% - Functional Accents & Status Indicators
    accent: "#38bdf8", // Sky blue brand
    accentHover: "#0ea5e9",
    accentMuted: "rgba(56, 189, 248, 0.14)",
    accentBorder: "rgba(56, 189, 248, 0.35)",

    success: "#10b981", // Emerald (Online, Resident)
    successMuted: "rgba(16, 185, 129, 0.12)",
    successBorder: "rgba(16, 185, 129, 0.3)",

    warning: "#f59e0b", // Amber (Visitor, Alert)
    warningMuted: "rgba(245, 158, 11, 0.12)",
    warningBorder: "rgba(245, 158, 11, 0.3)",

    danger: "#ef4444", // Rose / Red (Live, Motion, Suspect)
    dangerMuted: "rgba(239, 68, 68, 0.12)",
    dangerBorder: "rgba(239, 68, 68, 0.3)",

    tailscale: "#06b6d4", // Cyan WireGuard Mesh
    tailscaleMuted: "rgba(6, 182, 212, 0.12)",
    tailscaleBorder: "rgba(6, 182, 212, 0.3)",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    section: 36,
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 9999,
    full: 9999,
  },

  typography: {
    display: {
      fontSize: 22,
      fontWeight: "800" as const,
      letterSpacing: -0.4,
    },
    h1: {
      fontSize: 17,
      fontWeight: "700" as const,
      letterSpacing: -0.2,
    },
    h2: {
      fontSize: 15,
      fontWeight: "700" as const,
    },
    h3: {
      fontSize: 13,
      fontWeight: "600" as const,
    },
    body: {
      fontSize: 13,
      fontWeight: "400" as const,
      lineHeight: 18,
    },
    bodyBold: {
      fontSize: 13,
      fontWeight: "600" as const,
    },
    caption: {
      fontSize: 11,
      fontWeight: "500" as const,
    },
    captionBold: {
      fontSize: 11,
      fontWeight: "700" as const,
    },
    mono: {
      fontSize: 10,
      fontWeight: "700" as const,
      fontFamily: "monospace",
    },
  },

  shadows: {
    subtle: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
    elevated: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 10,
    },
  },
};
