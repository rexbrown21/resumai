"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import FloatingKeywords from "@/components/FloatingKeywords";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password || !confirm) { setError("Fill in both fields."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true); setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) { setError(error.message); setLoading(false); return; }

    router.push("/dashboard");
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
          <div className="tag" style={{ marginBottom: 32 }}>New password</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.1 }}>
            Set a new<br />password
          </h1>
          <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 40 }}>
            Choose a new password for your account.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }}
            />

            {error && <p className="mono" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}
              style={{ padding: "14px", borderRadius: 2, fontSize: 14, marginTop: 8 }}>
              {loading ? "Updating..." : "Update password →"}
            </button>

            <p className="mono" style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, textAlign: "center" }}>
              <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>← Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
