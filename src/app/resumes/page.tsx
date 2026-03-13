"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS, RESUME_TYPES } from "@/lib/constants";
import { Resume } from "@/types";

export default function Resumes() {
  const router = useRouter();
  const { resumes, setResumes } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Technical" as Resume["type"], notes: "" });

  const addResume = () => {
    if (!form.name) return;
    setResumes(prev => [...prev, {
      id: Date.now(), name: form.name, type: form.type,
      notes: form.notes, uploaded: new Date().toLocaleDateString(), tailored: 0,
    }]);
    setForm({ name: "", type: "Technical", notes: "" });
    setShowAdd(false);
  };

  const removeResume = (id: number) => setResumes(prev => prev.filter(r => r.id !== id));

  return (
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
        <div>
          <div className="tag" style={{ marginBottom: 16 }}>Resume Vault</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.text }}>Your resumes</h1>
          <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginTop: 8 }}>
            Store different versions. AI picks the best fit for each job.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "12px 24px", borderRadius: 2, marginTop: 24 }}>
          {showAdd ? "Cancel" : "+ Add resume"}
        </button>
      </div>

      {showAdd && (
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.accent}44`,
          padding: "32px", marginBottom: 2, animation: "fadeUp 0.3s ease",
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: COLORS.text }}>Add resume version</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <input
              placeholder="Resume name (e.g. 'Software Engineer v2')"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ padding: "12px 16px", borderRadius: 2, fontSize: 14 }}
            />
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as Resume["type"] })}
              style={{ padding: "12px 16px", borderRadius: 2, fontSize: 14 }}
            >
              {RESUME_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <textarea
            placeholder="Notes about this version (optional)..."
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14, marginTop: 12, height: 80, resize: "none" }}
          />
          <div style={{
            border: `2px dashed ${COLORS.border}`, borderRadius: 2,
            padding: "32px", textAlign: "center", marginTop: 12, cursor: "pointer",
          }}>
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>
              Drop PDF or DOCX here · or click to browse
            </p>
          </div>
          <button className="btn-primary" onClick={addResume}
            style={{ padding: "12px 28px", borderRadius: 2, marginTop: 16 }}>
            Save resume →
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {resumes.length === 0 ? (
          <div style={{ border: `2px dashed ${COLORS.border}`, padding: "80px", textAlign: "center" }}>
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 14 }}>
              No resumes yet. Add your first version above.
            </p>
          </div>
        ) : resumes.map(r => (
          <div key={r.id} className="card" style={{
            padding: "28px 32px", display: "flex",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{
                width: 40, height: 40, background: `${COLORS.accent}15`,
                border: `1px solid ${COLORS.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>📄</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>{r.name}</div>
                <div className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                  Added {r.uploaded} · Used {r.tailored}× in tailoring
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="tag">{r.type}</span>
              <button className="btn-ghost" style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>View</button>
              <button
                onClick={() => removeResume(r.id)}
                style={{
                  background: "transparent", border: "none", color: COLORS.textMuted,
                  cursor: "pointer", padding: "6px 10px", fontSize: 18, lineHeight: 1,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.danger)}
                onMouseLeave={e => (e.currentTarget.style.color = COLORS.textMuted)}
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}