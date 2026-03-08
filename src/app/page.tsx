"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/layout/Nav";

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <>
      <Nav />
      <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(232,255,71,0.04), transparent 60%)`,
        }} />

        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", textAlign: "center",
          padding: "120px 40px 80px", position: "relative", zIndex: 1,
        }}>
          <div className="tag animate-fade-up" style={{ marginBottom: 32, animationDelay: "0.1s", opacity: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 2s infinite" }} />
            AI-Powered Resume Intelligence
          </div>

          <h1 className="animate-fade-up" style={{
            fontSize: "clamp(52px, 9vw, 120px)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.95,
            animationDelay: "0.2s", opacity: 0, marginBottom: 8,
          }}>
            Built to fit.<br />
            <span className="serif" style={{ fontStyle: "italic", color: "var(--accent)" }}>Born to land.</span>
          </h1>

          <p className="animate-fade-up mono" style={{
            color: "var(--text-dim)", fontSize: 15, maxWidth: 480, marginTop: 32,
            lineHeight: 1.7, animationDelay: "0.35s", opacity: 0,
          }}>
            Stop sending the same resume everywhere. Let AI read the job, find the fit, and tailor your story — every single time.
          </p>

          <div className="animate-fade-up" style={{ display: "flex", gap: 12, marginTop: 48, animationDelay: "0.5s", opacity: 0 }}>
            <Link href="/signup" className="btn-primary" style={{ padding: "14px 36px", borderRadius: 2, fontSize: 14, textDecoration: "none" }}>
              Start for free →
            </Link>
            <Link href="/login" className="btn-ghost" style={{ padding: "14px 28px", borderRadius: 2, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </section>

        <section style={{
          borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
          padding: "40px 80px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40,
        }}>
          {[
            { n: "3×", label: "more interview callbacks" },
            { n: "<30s", label: "to tailor per application" },
            { n: "100%", label: "your voice, AI-optimized" },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em" }}>{n}</div>
              <div className="mono" style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </section>

        <section style={{ padding: "120px 80px" }}>
          <div className="tag" style={{ marginBottom: 24 }}>How it works</div>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 80, maxWidth: 600 }}>
            Four steps.<br />
            <span className="serif" style={{ fontStyle: "italic" }}>Zero guesswork.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
            {[
              { n: "01", title: "Upload your resumes", desc: "Store multiple versions — technical, managerial, consulting. Each one ready to be deployed.", icon: "⬆" },
              { n: "02", title: "Paste the job", desc: "Drop in the job description. The AI classifies role type, seniority, and required skills.", icon: "📋" },
              { n: "03", title: "AI tailors your resume", desc: "GPT-4o rewrites bullets, reorders sections, and surfaces the right keywords — all in your voice.", icon: "✦" },
              { n: "04", title: "Track every application", desc: "Log status, notes, and which resume version was sent. Never lose track of a pipeline.", icon: "📊" },
            ].map(({ n, title, desc, icon }) => (
              <div key={n} className="card" style={{ padding: "48px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>{n}</span>
                  <span style={{ fontSize: 24 }}>{icon}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
                <p className="mono" style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: "120px 80px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 24 }}>
            Your next job starts<br />
            <span style={{ color: "var(--accent)" }}>with the right resume.</span>
          </h2>
          <Link href="/signup" className="btn-primary" style={{ padding: "16px 48px", borderRadius: 2, fontSize: 15, marginTop: 16, textDecoration: "none" }}>
            Get started free →
          </Link>
        </section>

        <footer style={{ padding: "32px 80px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>RESUMAI</span>
          <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>© 2025 · Built with n8n + GPT-4o</span>
        </footer>
      </div>
    </>
  );
}