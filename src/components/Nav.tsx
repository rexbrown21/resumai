"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Resumes", href: "/resumes" },
    { label: "Tailor", href: "/tailor" },
    { label: "Tracker", href: "/tracker" },
  ];

  const navigate = (href: string) => {
    router.push(href);
    setMenuOpen(false);
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 64,
        background: "var(--bg)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => navigate(user ? "/dashboard" : "/")}
        >
          <div style={{
            width: 28, height: 28,
            background: COLORS.accent,
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: COLORS.text }}>
            RESUMAI
          </span>
        </div>

        {/* Right side — always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* Desktop nav links — hidden on mobile */}
          {user ? (
            <div className="nav-mobile-hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {navLinks.map(({ label, href }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  style={{
                    padding: "6px 16px", borderRadius: 2, fontSize: 12,
                    background: "transparent", cursor: "pointer",
                    fontFamily: "'Syne', sans-serif", fontWeight: 500,
                    letterSpacing: "0.05em",
                    border: `1px solid ${pathname === href ? COLORS.accent : COLORS.border}`,
                    color: pathname === href ? COLORS.accent : COLORS.textDim,
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
            </div>
          ) : (
            <div className="nav-mobile-hidden" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "8px 20px", borderRadius: 2, fontSize: 13,
                  background: "transparent", border: `1px solid ${COLORS.border}`,
                  color: COLORS.textDim, cursor: "pointer", fontFamily: "'Syne', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                Sign in
              </button>
              <button
                onClick={() => navigate("/signup")}
                style={{
                  padding: "8px 20px", borderRadius: 2, fontSize: 13,
                  background: COLORS.accent, border: "none",
                  color: "#080808", cursor: "pointer", fontFamily: "'Syne', sans-serif",
                  fontWeight: 700, letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
              >
                Get started
              </button>
            </div>
          )}

          {/* Theme toggle — ALWAYS visible */}
          <button
            onClick={toggleTheme}
            style={{
              background: theme === "dark" ? "#1a1a1a" : "#e0e0d8",
              border: "1px solid #555",
              color: theme === "dark" ? "#f0f0f0" : "#111",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 2,
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>

          {/* User avatar — desktop only */}
          {user && (
            <div className="nav-mobile-hidden" style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `${COLORS.accent}22`,
              border: `1px solid ${COLORS.accent}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: COLORS.accent, cursor: "pointer",
            }}>
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="nav-hamburger"
            style={{
              display: "none",
              background: "transparent", border: `1px solid ${COLORS.border}`,
              color: COLORS.text, cursor: "pointer",
              padding: "6px 10px", borderRadius: 2, fontSize: 16,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, zIndex: 99,
          background: "var(--bg)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "16px 20px 24px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {user ? (
            <>
              {navLinks.map(({ label, href }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  style={{
                    padding: "12px 16px", borderRadius: 2, fontSize: 14,
                    background: pathname === href ? `${COLORS.accent}10` : "transparent",
                    cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 500,
                    border: `1px solid ${pathname === href ? COLORS.accent : COLORS.border}`,
                    color: pathname === href ? COLORS.accent : COLORS.textDim,
                    textAlign: "left", width: "100%",
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "12px 16px", borderRadius: 2, fontSize: 14, width: "100%",
                  background: "transparent", border: `1px solid ${COLORS.border}`,
                  color: COLORS.textDim, cursor: "pointer", fontFamily: "'Syne', sans-serif",
                }}
              >
                Sign in
              </button>
              <button
                onClick={() => navigate("/signup")}
                style={{
                  padding: "12px 16px", borderRadius: 2, fontSize: 14, width: "100%",
                  background: COLORS.accent, border: "none",
                  color: "#080808", cursor: "pointer", fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                }}
              >
                Get started
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-hamburger { display: flex !important; }
          .nav-mobile-hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}