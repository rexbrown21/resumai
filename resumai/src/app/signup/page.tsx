"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";

export default function Signup() {
  const router = useRouter();
  const { setUser } = useApp();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { setError("Fill in all fields."); return; }
    setLoading(true); setError("");
    // TODO: replace with real Supabase auth call
    await new Promise(r => setTimeout(r, 1000));
    setUser({ id: "1", name: form.name, email: form.email });
    router.push("/dashboard");
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "40px",
    }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
        <div className="tag" style={{ marginBottom: 32 }}>Create account</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 40, color: COLORS.text }}>
          Start your job<br />search smarter.
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Full name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ padding: "14px 16px", borderRadius: 2, fontSize: 14, width: "100%" }}
          />
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
            {loading ? "Creating account..." : "Create account →"}
          </button>
        </div>

        <p className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 24, textAlign: "center" }}>
          Already have one?{" "}
          <span style={{ color: COLORS.accent, cursor: "pointer" }} onClick={() => router.push("/login")}>
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
