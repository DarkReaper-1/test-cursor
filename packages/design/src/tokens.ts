/**
 * Helix visual identity.
 * Warm lattice, not a cyan manhwa HUD.
 */
export const color = {
  void: "#0C0B0A",
  bg: "#141210",
  surface: "#1C1916",
  surfaceRaised: "#26211C",
  line: "#3A342C",
  text: "#F4EFE6",
  textMuted: "#A89F91",
  textFaint: "#6F675C",
  accent: "#D4A574",
  accentDim: "#8C6A45",
  success: "#8FBF9A",
  warning: "#D4B45A",
  danger: "#C97A6A",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  full: 999,
} as const;

export const type = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600" as const,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 1.4,
  },
  numeral: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "500" as const,
  },
} as const;

export const motion = {
  fast: 160,
  base: 240,
  slow: 400,
} as const;

export const tokens = { color, space, radius, type, motion };
