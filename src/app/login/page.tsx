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
            Sign in to<br />ResumAI
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" placeholder="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }} />
            <input type="password" placeholder="Password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14 }} />

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