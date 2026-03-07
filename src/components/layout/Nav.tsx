"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";

export default function Nav() {
  const { user, setUser } = useApp();
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/resumes", label: "Resumes" },
    { href: "/tailor", label: "Tailor" },
    { href: "/tracker", label: "Tracker" },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", height: 64,
      background: "rgba(8,8,8,0.92)",
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

      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 8px" }} />
          <div
            onClick={() => { setUser(null); window.location.href = "/"; }}
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
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
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
    </nav>
  );
}
