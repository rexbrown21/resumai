"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS, RESUME_TYPES } from "@/lib/constants";
import { Resume } from "@/types";
import AuthGuard from "@/components/AuthGuard";

export default function Resumes() {
  const router = useRouter();
  const { resumes, addResume, removeResume } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Technical" as Resume["type"], notes: "" });
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);

  const handleAddResume = async () => {
    if (!form.name) return;
    await addResume({ name: form.name, type: form.type, notes: form.notes, uploaded: "", tailored: 0 });
    setForm({ name: "", type: "Technical", notes: "" });
    setShowAdd(false);
  };

  const downloadPreviewPDF = (r: Resume) => {
    const s = r.structured_data;
    if (!s) return;
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 12;
      const maxWidth = pageWidth - margin * 2;
      let y = 14;

      const lh = 4.5;
      const secGap = 5;
      const bGap = 4.5;

      const addSection = (title: string) => {
        y += secGap;
        doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
        doc.text(title.toUpperCase(), margin, y);
        y += 2.5;
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      };

      doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      doc.text(s.name, margin, y); y += 5.5;
      doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
      doc.splitTextToSize(s.contact, maxWidth).forEach((l: string) => { doc.text(l, margin, y); y += lh; });
      y += 2;
      doc.setDrawColor(0, 0, 0); doc.line(margin, y, pageWidth - margin, y); y += 5;

      addSection("Professional Summary");
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
      doc.splitTextToSize(s.summary, maxWidth).forEach((l: string) => { doc.text(l, margin, y); y += lh; });

      if (s.experience?.length > 0) {
        addSection("Work Experience");
        s.experience.forEach((exp, idx) => {
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
          doc.text(`${exp.title} — ${exp.company}`, margin, y); y += 4;
          doc.setFontSize(8.5); doc.setFont("helvetica", "italic"); doc.setTextColor(90, 90, 90);
          doc.text(`${exp.location} | ${exp.period}`, margin, y); y += 4;
          exp.bullets?.forEach((b: string) => {
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
            doc.splitTextToSize(`\u2022 ${b}`, maxWidth - 4).forEach((l: string) => { doc.text(l, margin + 2, y); y += bGap; });
          });
          if (idx < s.experience.length - 1) y += 3;
        });
      }

      if (s.projects?.length > 0) {
        addSection("Projects");
        s.projects.forEach((proj, idx) => {
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
          doc.text(`${proj.name}${proj.period ? ` (${proj.period})` : ""}`, margin, y); y += 4;
          proj.bullets?.forEach((b: string) => {
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
            doc.splitTextToSize(`\u2022 ${b}`, maxWidth - 4).forEach((l: string) => { doc.text(l, margin + 2, y); y += bGap; });
          });
          if (idx < s.projects.length - 1) y += 3;
        });
      }

      if (s.education?.length > 0) {
        addSection("Education");
        s.education.forEach((edu) => {
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
          doc.text(edu.school, margin, y); y += 4;
          doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
          doc.text(`${edu.degree}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`, margin, y); y += lh;
          doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
          doc.text(`${edu.location} | ${edu.period}`, margin, y); y += 4;
        });
      }

      if (s.skills) {
        addSection("Skills");
        Object.entries(s.skills).forEach(([cat, val]) => {
          doc.setFontSize(9); doc.setTextColor(0, 0, 0);
          doc.splitTextToSize(`${cat}: ${val}`, maxWidth).forEach((l: string, i: number) => {
            if (i === 0) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
            doc.text(l, margin, y); y += lh;
          });
        });
      }

      doc.save(`${r.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    });
  };

  const s = previewResume?.structured_data;

  return (
    <AuthGuard>
      <style>{`
        .preview-panel {
          position: fixed; top: 0; right: 0; bottom: 0; width: 420px;
          background: var(--surface); border-left: 1px solid var(--border);
          overflow-y: auto; z-index: 100; padding: 32px;
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .preview-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99;
          animation: fadeUp 0.15s ease;
        }
        @media (max-width: 768px) {
          .preview-panel { width: 100%; }
        }
      `}</style>

      {/* Overlay */}
      {previewResume && <div className="preview-overlay" onClick={() => setPreviewResume(null)} />}

      {/* Preview panel */}
      {previewResume && (
        <div className="preview-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div className="tag" style={{ marginBottom: 8 }}>{previewResume.type}</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.02em", marginBottom: 4 }}>
                {previewResume.name}
              </h2>
              <p className="mono" style={{ color: COLORS.textMuted, fontSize: 11 }}>
                Added {previewResume.uploaded} · Used {previewResume.tailored}× in tailoring
              </p>
            </div>
            <button
              onClick={() => setPreviewResume(null)}
              style={{ background: "transparent", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4, marginTop: -4 }}
            >×</button>
          </div>

          {s ? (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textDim, lineHeight: 1.8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, marginBottom: 2 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 14 }}>{s.contact}</div>

              {s.summary && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: "0.08em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 3, marginBottom: 8 }}>PROFESSIONAL SUMMARY</div>
                  <p style={{ marginBottom: 14 }}>{s.summary}</p>
                </>
              )}

              {s.experience?.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: "0.08em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 3, marginBottom: 8 }}>WORK EXPERIENCE</div>
                  {s.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: COLORS.text }}>{exp.title} — {exp.company}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{exp.location} | {exp.period}</div>
                      {exp.bullets?.map((b, j) => <div key={j}>• {b}</div>)}
                    </div>
                  ))}
                </>
              )}

              {s.projects?.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: "0.08em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 3, marginBottom: 8, marginTop: 14 }}>PROJECTS</div>
                  {s.projects.map((proj, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: COLORS.text }}>{proj.name} {proj.period && `(${proj.period})`}</div>
                      {proj.bullets?.map((b, j) => <div key={j}>• {b}</div>)}
                    </div>
                  ))}
                </>
              )}

              {s.education?.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: "0.08em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 3, marginBottom: 8, marginTop: 14 }}>EDUCATION</div>
                  {s.education.map((edu, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: COLORS.text }}>{edu.school}</div>
                      <div>{edu.degree}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{edu.location} | {edu.period}</div>
                    </div>
                  ))}
                </>
              )}

              {s.skills && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, letterSpacing: "0.08em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 3, marginBottom: 8, marginTop: 14 }}>SKILLS</div>
                  {Object.entries(s.skills).map(([cat, val]) => (
                    <div key={cat}><span style={{ color: COLORS.text, fontWeight: 600 }}>{cat}:</span> {val as string}</div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={{ border: `1px dashed ${COLORS.border}`, padding: "24px", borderRadius: 2, textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>📄</div>
              <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.7 }}>
                No preview available for manually added resumes.<br />
                Use the Tailor page to generate a tailored version.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24, position: "sticky", bottom: 0, background: "var(--surface)", paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            {s && (
              <button
                onClick={() => downloadPreviewPDF(previewResume)}
                className="btn-primary"
                style={{ padding: "12px", borderRadius: 2, fontSize: 13 }}
              >
                Download PDF →
              </button>
            )}
            <button
              onClick={() => { setPreviewResume(null); router.push("/tailor"); }}
              className="btn-ghost"
              style={{ padding: "12px", borderRadius: 2, fontSize: 13 }}
            >
              Tailor this resume
            </button>
          </div>
        </div>
      )}

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
            <button className="btn-primary" onClick={handleAddResume}
              style={{ padding: "12px 28px", borderRadius: 2, marginTop: 16 }}>
              Save resume →
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {resumes.length === 0 ? (
            <div style={{ border: `2px dashed ${COLORS.border}`, padding: "80px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>No resumes yet</h3>
              <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
                Add your first resume version to get started.<br />AI will use it to tailor applications to any job.
              </p>
              <button className="btn-primary" onClick={() => setShowAdd(true)}
                style={{ padding: "12px 28px", borderRadius: 2 }}>
                + Add your first resume
              </button>
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
                    {r.structured_data && <span style={{ color: COLORS.accent, marginLeft: 8 }}>· Preview available</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="tag">{r.type}</span>
                <button
                  onClick={() => setPreviewResume(r)}
                  style={{
                    padding: "6px 16px", borderRadius: 2, fontSize: 12,
                    fontFamily: "'DM Mono', monospace", cursor: "pointer",
                    background: "transparent",
                    border: `1px solid ${COLORS.accent}`,
                    color: COLORS.accent,
                    transition: "all 0.15s",
                  }}
                >
                  View
                </button>
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
    </AuthGuard>
  );
}