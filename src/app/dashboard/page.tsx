"use client";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

export default function Dashboard() {
  const router = useRouter();
  const { user, setUser, resumes, applications } = useApp();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const stats = [
    { label: "Resumes stored", value: resumes.length, color: COLORS.accent },
    { label: "Applications", value: applications.length, color: "#60a5fa" },
    { label: "Interviews", value: applications.filter(a => a.status === "Interview").length, color: COLORS.success },
    { label: "Pending", value: applications.filter(a => a.status === "Applied").length, color: COLORS.textDim },
  ];

  const statusColors: Record<string, string> = {
    Applied: "#60a5fa", Interview: COLORS.success,
    Offer: COLORS.accent, Rejected: COLORS.danger, Saved: COLORS.textMuted,
  };

  return (
    <AuthGuard>
    <div style={{ padding: "100px 60px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="tag" style={{ marginBottom: 16 }}>Dashboard</div>
            <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.text }}>
              Good morning,{" "}
              <span style={{ color: COLORS.accent }}>{user?.name || "there"}</span>
            </h1>
            <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginTop: 8 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={handleLogout} className="btn-ghost"
            style={{ padding: "8px 20px", borderRadius: 2, fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)", marginTop: 8 }}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 2 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "32px" }}>
            <div style={{ fontSize: 40, fontWeight: 800, color, letterSpacing: "-0.04em" }}>{value}</div>
            <div className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2, marginTop: 2 }}>
        <div className="card" style={{ padding: "40px" }}>
          <div className="tag" style={{ marginBottom: 20 }}>Quick action</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12, color: COLORS.text }}>
            Tailor a resume<br />
            <span className="serif">right now.</span>
          </h2>
          <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 28, lineHeight: 1.7 }}>
            Paste a job description and let AI match and optimize your best-fit resume in seconds.
          </p>
          <button className="btn-primary" onClick={() => router.push("/tailor")}
            style={{ padding: "12px 28px", borderRadius: 2 }}>
            Start tailoring →
          </button>
        </div>

        <div className="card" style={{ padding: "40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="tag" style={{ marginBottom: 20 }}>Resume vault</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: COLORS.text }}>
              {resumes.length} version{resumes.length !== 1 ? "s" : ""} stored
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resumes.slice(0, 3).map(r => (
                <div key={r.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: "#0a0a0a", border: `1px solid ${COLORS.border}`,
                }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>{r.name}</span>
                  <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>{r.type}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="btn-ghost" onClick={() => router.push("/resumes")}
            style={{ padding: "10px", borderRadius: 2, marginTop: 20, width: "100%" }}>
            Manage resumes
          </button>
        </div>
      </div>

      {applications.length > 0 && (
        <div className="card" style={{ padding: "40px", marginTop: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div className="tag">Recent applications</div>
            <button className="btn-ghost" onClick={() => router.push("/tracker")}
              style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>View all</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {applications.slice(0, 4).map(app => (
              <div key={app.id} style={{
                background: "#0a0a0a", border: `1px solid ${COLORS.border}`,
                padding: "14px 20px", display: "flex", alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[app.status] || COLORS.textMuted }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{app.company}</div>
                    <div className="mono" style={{ fontSize: 12, color: COLORS.textMuted }}>{app.role}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {app.matchScore && <span className="mono" style={{ fontSize: 12, color: COLORS.accent }}>{app.matchScore}% match</span>}
                  <span style={{
                    padding: "3px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace",
                    background: `${statusColors[app.status]}15`,
                    border: `1px solid ${statusColors[app.status]}30`,
                    color: statusColors[app.status],
                  }}>{app.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
