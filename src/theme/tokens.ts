/**
 * Design tokens. One source of truth for colors, spacing, and elevation
 * across the whole app. Bright but balanced — meant to feel modern without
 * leaning on a UI library.
 */

export const color = {
  // primary brand
  primary: "#6366f1",
  primaryHover: "#4f46e5",
  primaryFaint: "#eef2ff",
  primaryBorder: "#c7d2fe",

  // semantic
  success: "#10b981",
  successFaint: "#d1fae5",
  warning: "#f59e0b",
  warningFaint: "#fef3c7",
  danger: "#ef4444",
  dangerFaint: "#fee2e2",

  // surfaces
  bg: "#fafbfc",
  surface: "#ffffff",
  surfaceMuted: "#f3f4f6",

  // strokes
  border: "#e5e7eb",
  borderStrong: "#d1d5db",

  // text
  text: "#111827",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999,
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.04)",
  md: "0 2px 8px rgba(15, 23, 42, 0.08)",
  lg: "0 8px 24px rgba(15, 23, 42, 0.12)",
} as const;

export const font = {
  family: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;
