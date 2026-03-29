"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import FloatingKeywords from "@/components/FloatingKeywords";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <>
      <Nav />
      <FloatingKeywords />
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "40px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
          <div className="tag" style={{ marginBottom: 32 }}>Password reset</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.1 }}>
            Forgot your<br />password?
          </h1>
          <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 40 }}>
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <p className="mono" style={{ color: "var(--success)", fontSize: 13, marginBottom: 24 }}>
                Reset link sent — check your inbox.
              </p>
              <Link href="/login" className="mono" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }}
              />

              {error && <p className="mono" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}

              <button className="btn-primary" onClick={handleSubmit} disabled={loading}
                style={{ padding: "14px", borderRadius: 2, fontSize: 14, marginTop: 8 }}>
                {loading ? "Sending..." : "Send reset link →"}
              </button>

              <p className="mono" style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, textAlign: "center" }}>
                <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>← Back to sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
