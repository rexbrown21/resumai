"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { Resume, TailorResult } from "@/types";

type Step = "input" | "analyzing" | "result";

export default function Tailor() {
  const { resumes, addApplication } = useApp();
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<TailorResult & { tailoredResume?: string } | null>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!jobDesc) return;
    if (!resumeText) { setError("Please paste your resume text below."); return; }
    setError("");
    setStep("analyzing");

    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDesc,
          resumeText,
          resumeName: selectedResume?.name || "Resume",
        }),
      });

      if (!res.ok) throw new Error("API call failed");

      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  };

  const downloadResume = () => {
    if (!result?.tailoredResume) return;

    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(selectedResume?.name || "Tailored Resume", margin, 20);

      // Role + Company
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Tailored for: ${role || "Role"} at ${company || "Company"}`, margin, 30);
      doc.text(`Match Score: ${result.matchScore}%`, margin, 38);

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, 43, pageWidth - margin, 43);

      // Resume content
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(result.tailoredResume || "", maxWidth);
      let y = 52;

      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      });

      doc.save(`${selectedResume?.name || "resume"}-tailored.pdf`);
    });
  };

  const logApplication = () => {
    if (!result) return;
    downloadResume();
    addApplication({
      id: Date.now(),
      company: company || "Unnamed Company",
      role: role || "Unknown Role",
      status: "Applied",
      resumeUsed: selectedResume?.name || "Unknown",
      date: new Date().toLocaleDateString(),
      matchScore: result.matchScore,
      notes: "",
    });
    setStep("input");
    setJobDesc(""); setCompany(""); setRole("");
    setResult(null); setSelectedResume(null); setResumeText("");
  };

  return (
    <div style={{ padding: "100px 60px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <div className="tag" style={{ marginBottom: 16 }}>AI Tailor</div>
      <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 48, color: COLORS.text }}>
        Tailor your resume
      </h1>

      {step === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="card" style={{ padding: "32px" }}>
                <div className="tag" style={{ marginBottom: 16 }}>Job details</div>
                <input placeholder="Company name" value={company}
                  onChange={e => setCompany(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14, marginBottom: 10 }} />
                <input placeholder="Role title" value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14 }} />
              </div>
              <div className="card" style={{ padding: "32px", flex: 1 }}>
                <div className="tag" style={{ marginBottom: 16 }}>Job description</div>
                <textarea
                  placeholder="Paste the full job description here..."
                  value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                  style={{
                    width: "100%", height: 280, padding: "14px 16px", borderRadius: 2,
                    fontSize: 13, lineHeight: 1.7, resize: "none",
                    fontFamily: "'DM Mono', monospace",
                  }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="card" style={{ padding: "32px" }}>
                <div className="tag" style={{ marginBottom: 20 }}>Select base resume</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resumes.length === 0 ? (
                    <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>
                      No resumes added yet.
                    </p>
                  ) : resumes.map(r => (
                    <div key={r.id} onClick={() => setSelectedResume(r)} style={{
                      padding: "14px 18px",
                      border: `1px solid ${selectedResume?.id === r.id ? COLORS.accent : COLORS.border}`,
                      background: selectedResume?.id === r.id ? `${COLORS.accent}08` : "#0a0a0a",
                      cursor: "pointer", transition: "all 0.2s",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{r.name}</span>
                      <span className="tag">{r.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-primary" onClick={analyze} disabled={!jobDesc || !resumeText}
                style={{ padding: "20px", borderRadius: 2, fontSize: 15 }}>
                Analyze & tailor →
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: "32px" }}>
            <div className="tag" style={{ marginBottom: 16 }}>Your resume text</div>
            <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
              Paste the full text of your resume here — the AI will read and rewrite it.
            </p>
            <textarea
              placeholder="Paste your full resume text here..."
              value={resumeText} onChange={e => setResumeText(e.target.value)}
              style={{
                width: "100%", height: 200, padding: "14px 16px", borderRadius: 2,
                fontSize: 13, lineHeight: 1.7, resize: "none",
                fontFamily: "'DM Mono', monospace",
              }} />
          </div>

          {error && (
            <p className="mono" style={{ color: COLORS.danger, fontSize: 13 }}>{error}</p>
          )}
        </div>
      )}

      {step === "analyzing" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "60vh", gap: 32, animation: "fadeIn 0.4s ease",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: `2px solid ${COLORS.border}`,
            borderTopColor: COLORS.accent,
            animation: "spin 1s linear infinite",
          }} />
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12, color: COLORS.text }}>
              Analyzing job description
            </h2>
            <p className="mono" style={{ color: COLORS.textDim, fontSize: 13 }}>
              Classifying role · Identifying keywords · Optimizing resume...
            </p>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div style={{ animation: "fadeUp 0.5s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, marginBottom: 2 }}>
            <div className="card" style={{ padding: "28px" }}>
              <div className="mono" style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>MATCH SCORE</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: COLORS.accent, letterSpacing: "-0.04em" }}>{result.matchScore}%</div>
            </div>
            <div className="card" style={{ padding: "28px" }}>
              <div className="mono" style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>JOB TYPE DETECTED</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.03em" }}>{result.jobType}</div>
            </div>
            <div className="card" style={{ padding: "28px" }}>
              <div className="mono" style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12 }}>KEYWORDS ADDED</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.keywords.map(k => (
                  <span key={k} style={{
                    padding: "3px 10px", background: `${COLORS.accent}15`,
                    border: `1px solid ${COLORS.accent}30`,
                    fontSize: 12, fontFamily: "'DM Mono', monospace", color: COLORS.accent,
                  }}>{k}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 2 }}>
            <div className="card" style={{ padding: "32px" }}>
              <div className="tag" style={{ marginBottom: 20 }}>What AI changed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: `${COLORS.success}20`, border: `1px solid ${COLORS.success}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: COLORS.success, flexShrink: 0, marginTop: 1,
                    }}>✓</div>
                    <span className="mono" style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="tag" style={{ marginBottom: 20 }}>Resume used</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: COLORS.text }}>{selectedResume?.name || "Auto-selected"}</div>
                <div className="mono" style={{ color: COLORS.textDim, fontSize: 13 }}>
                  Type: {selectedResume?.type} · Tailored for {company || "this role"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
                <button className="btn-primary" onClick={logApplication} style={{ padding: "14px", borderRadius: 2 }}>
                  Download & log application →
                </button>
                <button className="btn-ghost" onClick={downloadResume} style={{ padding: "12px", borderRadius: 2 }}>
                  Download PDF only
                </button>
                <button className="btn-ghost" onClick={() => setStep("input")} style={{ padding: "12px", borderRadius: 2 }}>
                  Tailor another
                </button>
              </div>
            </div>
          </div>

          {result.tailoredResume && (
            <div className="card" style={{ padding: "32px" }}>
              <div className="tag" style={{ marginBottom: 20 }}>Tailored resume preview</div>
              <pre style={{
                fontFamily: "'DM Mono', monospace", fontSize: 12,
                color: COLORS.textDim, lineHeight: 1.8,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {result.tailoredResume}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}