"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import FloatingKeywords from "@/components/FloatingKeywords";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { setUser } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Fill in all fields."); return; }
    setLoading(true); setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) { setError(error.message); setLoading(false); return; }

    setUser({
      id: data.user.id,
      name: data.user.user_metadata?.name || form.email.split("@")[0],
      email: data.user.email!,
    });

    router.push("/dashboard");
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) setError(error.message);
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
          <div className="tag" style={{ marginBottom: 32 }}>Welcome back</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.1 }}>
            Sign in to<br />RezumeAI
          </h1>

          <button onClick={handleGoogleSignIn}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "14px", borderRadius: 2, fontSize: 14,
              fontWeight: 600, fontFamily: "'Syne', sans-serif", cursor: "pointer",
              background: "#ffffff", color: "#3c4043", border: "1px solid var(--border)",
            }}>
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" placeholder="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }} />
            <div>
              <input type="password" placeholder="Password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14, width: "100%" }} />
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <Link href="/reset-password" className="mono" style={{ color: "var(--text-muted)", fontSize: 11, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && <p className="mono" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}
              style={{ padding: "14px", borderRadius: 2, fontSize: 14, marginTop: 8 }}>
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </div>

          <p className="mono" style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 24, textAlign: "center" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none" }}>Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
}