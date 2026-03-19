"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function Nav() {
  const { user, setUser, sessionLoaded } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    { href: "/dashboard", label: "Dashboard" },
    { href: "/resumes", label: "Resumes" },
    { href: "/tailor", label: "Tailor" },
    { href: "/tracker", label: "Tracker" },
  ];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 64,
        background: "var(--bg)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <Link href={user ? "/dashboard" : "/"} style={{
          display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
        }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--accent)",
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "var(--text)" }}>
            RESUMAI
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!sessionLoaded ? (
            <div style={{ width: 120 }} />
          ) : user ? (
            <div className="nav-mobile-hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="btn-ghost"
                  style={{
                    padding: "6px 16px", borderRadius: 2, fontSize: 12,
                    textDecoration: "none",
                    borderColor: pathname === href ? "var(--accent)" : "var(--border)",
                    color: pathname === href ? "var(--accent)" : "var(--text-dim)",
                  }}>
                  {label}
                </Link>
              ))}
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
            </div>
          ) : (
            <div className="nav-mobile-hidden" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link href="/login" className="btn-ghost"
                style={{ padding: "8px 20px", borderRadius: 2, textDecoration: "none" }}>
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary"
                style={{ padding: "8px 20px", borderRadius: 2, textDecoration: "none" }}>
                Get started
              </Link>
            </div>
          )}

          {/* Theme toggle */}
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

          {/* Avatar with dropdown — only when logged in */}
          {sessionLoaded && user && (
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(232,255,71,0.1)",
                  border: "1px solid rgba(232,255,71,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "var(--accent)",
                  cursor: "pointer",
                }}>
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: 40, right: 0,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 2, minWidth: 160, zIndex: 200,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{user.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/profile");
                    }}
                    style={{
                      width: "100%", padding: "10px 16px", fontSize: 13,
                      background: "transparent", border: "none",
                      color: "var(--text-dim)", cursor: "pointer", textAlign: "left",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      await supabase.auth.signOut();
                      setUser(null);
                      window.location.href = "/";
                    }}
                    style={{
                      width: "100%", padding: "10px 16px", fontSize: 13,
                      background: "transparent", border: "none", borderTop: "1px solid var(--border)",
                      color: "var(--danger)", cursor: "pointer", textAlign: "left",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {dropdownOpen && (
        <div
          onClick={() => setDropdownOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 199 }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-mobile-hidden { display: none !important; }
        }
        [data-theme="light"] nav {
          background: var(--bg) !important;
        }
      `}</style>
    </>
  );
}