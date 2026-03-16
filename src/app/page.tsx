"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Nav from "@/components/layout/Nav";

const FLOATING_KEYWORDS = [
  "Python", "Leadership", "Product Manager", "AWS", "React", "TypeScript",
  "DevOps", "Machine Learning", "Kubernetes", "SQL", "Agile", "Scrum",
  "CI/CD", "Docker", "Node.js", "Data Analysis", "Strategic Planning",
  "Stakeholder Management", "API Design", "Prompt Engineering", "n8n",
  "Automation", "FastAPI", "Communication", "Problem Solving", "Git",
  "Figma", "UX Research", "Cloud Architecture", "Team Lead",
];

const MARQUEE_ITEMS = [
  "ATS Optimized", "Tailored in 28s",
  "Your Voice", "AI-Powered",
  "PDF Ready", "Real Results", "Every Application",
];

function FloatingKeywords() {
  const [keywords, setKeywords] = useState<{ id: number; word: string; x: number; duration: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    const items = FLOATING_KEYWORDS.map((word, i) => ({
      id: i,
      word,
      x: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 15,
      size: 10 + Math.random() * 4,
    }));
    setKeywords(items);
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0, overflow: "hidden",
    }}>
      {keywords.map(({ id, word, x, duration, delay, size }) => (
        <div key={id} style={{
          position: "absolute",
          left: `${x}%`,
          bottom: "-40px",
          fontFamily: "'DM Mono', monospace",
          fontSize: `${size}px`,
          color: "var(--keyword-color)",
          opacity: 0.16,
          animation: `floatUp ${duration}s ${delay}s linear infinite`,
          whiteSpace: "nowrap",
          letterSpacing: "0.05em",
        }}>
          {word}
        </div>
      ))}
    </div>
  );
}

function CountUp({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1500;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{prefix}{count}{suffix}</div>;
}

function MarqueeTicker() {
  return (
    <div style={{
      overflow: "hidden", borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)", padding: "12px 0",
      background: "var(--surface)",
    }}>
      <div style={{
        display: "flex", gap: 48,
        animation: "marquee 20s linear infinite",
        width: "max-content",
      }}>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} style={{
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            color: "var(--text-dim)", letterSpacing: "0.1em",
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: "var(--accent)", marginRight: 12 }}>✦</span>
            {item.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const getMagneticStyle = (id: string, baseStyle: React.CSSProperties): React.CSSProperties => {
    if (hoveredBtn !== id) return baseStyle;
    return { ...baseStyle, transform: "translateY(-2px) scale(1.02)" };
  };

  return (
    <>
      <Nav />
      <div style={{ minHeight: "100vh", overflowX: "hidden", position: "relative" }}>

        <FloatingKeywords />

        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(232,255,71,0.05), transparent 60%)`,
        }} />

        {/* Hero */}
        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", textAlign: "center",
          padding: "120px 24px 80px", position: "relative", zIndex: 1,
        }}>
          <div className="tag animate-fade-up" style={{ marginBottom: 32, animationDelay: "0.1s", opacity: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 2s infinite" }} />
            AI-Powered Resume Intelligence
          </div>

          <h1 className="animate-fade-up" style={{
            fontSize: "clamp(48px, 9vw, 120px)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.95,
            animationDelay: "0.2s", opacity: 0, marginBottom: 8,
          }}>
            Built to fit.<br />
            <span className="serif" style={{ fontStyle: "italic", color: "var(--accent)" }}>Born to land.</span>
          </h1>

          <p className="animate-fade-up mono" style={{
            color: "var(--text-dim)", fontSize: 15, maxWidth: 480, marginTop: 32,
            lineHeight: 1.7, animationDelay: "0.35s", opacity: 0, padding: "0 8px",
          }}>
            Stop sending the same resume everywhere. Let AI read the job, find the fit, and tailor your story — every single time.
          </p>

          <div className="animate-fade-up" style={{
            display: "flex", gap: 12, marginTop: 48,
            animationDelay: "0.5s", opacity: 0,
            flexWrap: "wrap", justifyContent: "center",
          }}>
            <Link
              href="/signup"
              className="btn-primary"
              onMouseEnter={() => setHoveredBtn("signup")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={getMagneticStyle("signup", {
                padding: "14px 36px", borderRadius: 2, fontSize: 14,
                textDecoration: "none", transition: "all 0.2s",
                boxShadow: "0 0 30px rgba(232,255,71,0.2)",
              })}
            >
              Start for free →
            </Link>
            <Link
              href="/login"
              className="btn-ghost"
              onMouseEnter={() => setHoveredBtn("login")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={getMagneticStyle("login", {
                padding: "14px 28px", borderRadius: 2,
                textDecoration: "none", transition: "all 0.2s",
              })}
            >
              Sign in
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="animate-fade-up" style={{
            position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
            animationDelay: "1s", opacity: 0,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.2em" }}>SCROLL</span>
            <div style={{
              width: 1, height: 40,
              background: "linear-gradient(to bottom, var(--accent), transparent)",
              animation: "pulse 2s infinite",
            }} />
          </div>
        </section>

        {/* Marquee */}
        <MarqueeTicker />

        {/* Stats */}
        <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2, maxWidth: 900, margin: "0 auto",
          }}>
            {[
              { target: 3, suffix: "x", prefix: "", label: "more interview callbacks", desc: "vs generic resume submissions" },
              { target: 30, suffix: "s", prefix: "<", label: "to tailor per application", desc: "AI processes and optimizes instantly" },
              { target: 100, suffix: "%", prefix: "", label: "your voice preserved", desc: "AI enhances, never replaces you" },
            ].map(({ target, suffix, prefix, label, desc }) => (
              <div key={label} className="card" style={{ padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "var(--accent)", opacity: 0.6,
                }} />
                <div style={{
                  fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800,
                  color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1,
                }}>
                  <CountUp target={target} suffix={suffix} prefix={prefix} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginTop: 12 }}>{label}</div>
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="tag" style={{ marginBottom: 24 }}>How it works</div>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 64px)", fontWeight: 800,
              letterSpacing: "-0.03em", marginBottom: 60, maxWidth: 600,
            }}>
              Four steps.<br />
              <span className="serif" style={{ fontStyle: "italic" }}>Zero guesswork.</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2 }}>
              {[
                { n: "01", title: "Upload your resumes", desc: "Store multiple versions — technical, managerial, consulting. Each one ready to be deployed.", icon: "⬆", color: "#e8ff47" },
                { n: "02", title: "Paste the job", desc: "Drop in the job description. AI classifies role type, seniority, and required skills instantly.", icon: "📋", color: "#00d4ff" },
                { n: "03", title: "AI tailors your resume", desc: "Llama 3.3 rewrites bullets, reorders sections, and surfaces the right keywords — in your voice.", icon: "✦", color: "#e8ff47" },
                { n: "04", title: "Track every application", desc: "Log status, notes, and which resume version was sent. Never lose track of your pipeline.", icon: "📊", color: "#00ff88" },
              ].map(({ n, title, desc, icon, color }, i) => (
                <div key={n} className="card step-card" style={{
                  padding: "40px 32px", position: "relative", overflow: "hidden",
                  animation: `fadeUp 0.6s ${0.1 + i * 0.1}s ease both`,
                }}>
                  <div style={{
                    position: "absolute", bottom: -10, right: -10,
                    fontSize: 120, fontWeight: 800, color,
                    opacity: 0.15, lineHeight: 1, letterSpacing: "-0.05em",
                    pointerEvents: "none", userSelect: "none",
                  }}>{n}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>{n}</span>
                    <span style={{ fontSize: 28 }}>{icon}</span>
                  </div>
                  <div style={{ width: 24, height: 2, background: color, marginBottom: 16, opacity: 0.7 }} />
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{title}</h3>
                  <p className="mono" style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* CTA */}
        <section style={{
          padding: "120px 24px", textAlign: "center",
          borderTop: "1px solid var(--border)", position: "relative", zIndex: 1,
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,255,71,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div className="tag" style={{ marginBottom: 24 }}>Get started</div>
          <h2 style={{
            fontSize: "clamp(32px, 6vw, 80px)", fontWeight: 800,
            letterSpacing: "-0.04em", marginBottom: 24, lineHeight: 0.95,
          }}>
            Your next job starts<br />
            <span style={{ color: "var(--accent)" }}>with the right resume.</span>
          </h2>
          <p className="mono" style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 40 }}>
            Free to use. No credit card required.
          </p>
          <Link
            href="/signup"
            className="btn-primary"
            style={{
              padding: "18px 56px", borderRadius: 2, fontSize: 15,
              textDecoration: "none", display: "inline-flex",
              boxShadow: "0 0 40px rgba(232,255,71,0.15)",
              transition: "all 0.2s",
            }}
          >
            Start tailoring for free →
          </Link>
        </section>

        {/* Footer */}
        <footer style={{
          padding: "32px 24px", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 20, height: 20, background: "var(--accent)",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }} />
            <span style={{ fontWeight: 800, fontSize: 14 }}>RESUMAI</span>
          </div>
          <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
            © 2025 · Built with Groq + Llama 3.3 · Made for Africa
          </span>
        </footer>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          5%   { opacity: 0.12; }
          95%  { opacity: 0.12; }
          100% { transform: translateY(-105vh) rotate(8deg); opacity: 0; }
        }

        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }

        .step-card {
          transition: transform 0.3s ease, border-color 0.3s ease !important;
        }
        .step-card:hover {
          transform: translateY(-4px) !important;
          border-color: var(--border-light) !important;
        }

        @media (max-width: 768px) {
          .nav-hamburger { display: flex !important; }
          .nav-mobile-hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
