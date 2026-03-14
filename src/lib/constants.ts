export const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  border: "var(--border)",
  borderLight: "var(--border-light)",
  accent: "var(--accent)",
  accentDim: "var(--accent-dim)",
  text: "var(--text)",
  textMuted: "var(--text-muted)",
  textDim: "var(--text-dim)",
  danger: "var(--danger)",
  success: "var(--success)",
};

export const RESUME_TYPES = ["Technical", "Managerial", "Consulting", "Research", "General"] as const;

export const APP_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;

export const STATUS_COLORS: Record<string, string> = {
  Applied: "#60a5fa",
  Interview: "#2ed573",
  Offer: "#e8ff47",
  Rejected: "#ff4757",
  Saved: "#666",
};