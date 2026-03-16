"use client";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999,
        width: 64,
        height: 32,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        padding: 3,
        background: isDark ? "#1a1a1a" : "#e0e0d8",
        boxShadow: isDark
          ? "0 0 0 1px #333, 0 4px 12px rgba(0,0,0,0.4)"
          : "0 0 0 1px #ccc, 0 4px 12px rgba(0,0,0,0.15)",
        transition: "background 0.3s ease",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Track icons */}
      <div style={{
        position: "absolute",
        left: 8,
        fontSize: 11,
        opacity: isDark ? 0.5 : 0,
        transition: "opacity 0.3s",
        pointerEvents: "none",
      }}>🌙</div>
      <div style={{
        position: "absolute",
        right: 8,
        fontSize: 11,
        opacity: isDark ? 0 : 0.6,
        transition: "opacity 0.3s",
        pointerEvents: "none",
      }}>☀️</div>

      {/* Thumb */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: isDark ? "#f0f0f0" : "#111111",
        transform: isDark ? "translateX(0)" : "translateX(32px)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        flexShrink: 0,
      }}>
        {isDark ? "🌙" : "☀️"}
      </div>
    </button>
  );
}