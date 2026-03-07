"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";

export default function Login() {
  const router = useRouter();
  const { setUser } = useApp();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Fill in all fields."); return; }
    setLoading(true); setError("");
    // TODO: replace with real Supabase auth call
    await new Promise(r => setTimeout(r, 1000));
    setUser({ id: "1", name: form.email.split("@")[0], email: form.email });
    router.push("/dashboard");
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "40px",
    }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
        <div className="tag" style={{ marginBottom: 32 }}>Welcome back</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 40, color: COLORS.text }}>
          Sign in to<br />ResumAI
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email" placeholder="Email address" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14, width: "100%" }}
          />
          <input
            type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14, width: "100%" }}
          />
          {error && <p className="mono" style={{ color: COLORS.danger, fontSize: 12 }}>{error}</p>}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ padding: "14px", borderRadius: 2, fontSize: 14, marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>

        <p className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 24, textAlign: "center" }}>
          No account?{" "}
          <span style={{ color: COLORS.accent, cursor: "pointer" }} onClick={() => router.push("/signup")}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
