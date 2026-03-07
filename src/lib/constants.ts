export const COLORS = {
  bg: "#080808",
  surface: "#0f0f0f",
  border: "#1a1a1a",
  borderLight: "#252525",
  accent: "#e8ff47",
  accentDim: "#c8df27",
  text: "#f0f0f0",
  textMuted: "#666",
  textDim: "#999",
  danger: "#ff4757",
  success: "#2ed573",
} as const;

export const RESUME_TYPES = ["Technical", "Managerial", "Consulting", "Research", "General"] as const;
export const APP_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;

export const STATUS_COLORS: Record<string, string> = {
  Applied: "#60a5fa",
  Interview: COLORS.success,
  Offer: COLORS.accent,
  Rejected: COLORS.danger,
  Saved: COLORS.textMuted,
};
