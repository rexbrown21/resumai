"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS, APP_STATUSES, STATUS_COLORS } from "@/lib/constants";
import { Application } from "@/types";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

export default function Tracker() {
  const router = useRouter();
  const { user, applications, setApplications } = useApp();
  const [filter, setFilter] = useState<"All" | Application["status"]>("All");

  const filtered = filter === "All" ? applications : applications.filter(a => a.status === filter);

  const updateStatus = (id: number, status: Application["status"]) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteApplication = async (id: number) => {
    await supabase.from("applications").delete().eq("id", id).eq("user_id", user!.id);
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AuthGuard>
    <div style={{ padding: "100px 60px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <button
        onClick={() => router.push("/dashboard")}
        style={{
          background: "transparent", border: "none", color: COLORS.textDim,
          fontSize: 13, fontFamily: "'DM Mono', monospace", cursor: "pointer",
          marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ marginBottom: 48 }}>
        <div className="tag" style={{ marginBottom: 16 }}>Application Tracker</div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.text }}>
          Your pipeline
        </h1>
        <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginTop: 8 }}>
          {applications.length} total · {applications.filter(a => a.status === "Interview").length} interviews ·{" "}
          {applications.filter(a => a.status === "Offer").length} offers
        </p>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
        {(["All", ...APP_STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s as typeof filter)}
            className={filter === s ? "btn-primary" : "btn-ghost"}
            style={{ padding: "8px 20px", borderRadius: 2, fontSize: 12, flex: 1 }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ border: `2px dashed ${COLORS.border}`, padding: "80px", textAlign: "center" }}>
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 14 }}>
              No applications{filter !== "All" ? ` with status "${filter}"` : " yet"}.
            </p>
          </div>
        ) : filtered.map(app => (
          <div key={app.id} className="card" style={{
            padding: "20px 28px", display: "flex",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: STATUS_COLORS[app.status] || COLORS.textMuted,
                boxShadow: `0 0 8px ${STATUS_COLORS[app.status] || COLORS.textMuted}44`,
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{app.company}</div>
                <div className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{app.role}</div>
              </div>
              {app.matchScore && (
                <span className="mono" style={{ fontSize: 13, color: COLORS.accent }}>{app.matchScore}% fit</span>
              )}
              <span className="tag">{app.resumeUsed}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>{app.date}</span>
              <select
                value={app.status}
                onChange={e => updateStatus(app.id, e.target.value as Application["status"])}
                style={{ padding: "6px 12px", borderRadius: 2, fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer" }}
              >
                {APP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={() => deleteApplication(app.id)}
                style={{
                  background: "transparent", border: `1px solid ${COLORS.border}`,
                  color: COLORS.danger, fontSize: 12, fontFamily: "'DM Mono', monospace",
                  padding: "6px 12px", borderRadius: 2, cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </AuthGuard>
  );
}