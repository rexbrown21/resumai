"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { ROLE_TYPES, RoleType, AuditReport, AuditCategory, AuditFlag } from "@/lib/auditRules";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import { extractResumeText } from "@/lib/extractResumeText";

const CATEGORY_LABELS: { key: keyof Pick<AuditReport, "structure" | "ats" | "achievement_quality" | "role_fit">; label: string }[] = [
  { key: "structure", label: "Structure & Completeness" },
  { key: "ats", label: "ATS Compatibility" },
  { key: "achievement_quality", label: "Achievement Quality" },
  { key: "role_fit", label: "Role/Company Fit" },
];

const FLAG_ICONS: Record<AuditFlag["status"], string> = {
  good: "✅",
  warning: "⚠️",
  critical: "❌",
};

/** Green at 75+, accent yellow in the middle band, danger red below 50. */
function scoreColor(score: number): string {
  if (score >= 75) return COLORS.success;
  if (score >= 50) return COLORS.accent;
  return COLORS.danger;
}

function flagColor(status: AuditFlag["status"]): string {
  if (status === "good") return COLORS.success;
  if (status === "warning") return COLORS.accent;
  return COLORS.danger;
}

export default function Audit() {
  const router = useRouter();
  const { user } = useApp();

  // Progressive disclosure: 1 = upload, 2 = targeting, 3 = results.
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [roleType, setRoleType] = useState<RoleType>("Technical");
  const [company, setCompany] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditReport | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!selected) return;

    const lower = selected.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setFile(null);
      setResumeText("");
      setUploadError("Couldn't read this file. Please try a different PDF or DOCX file.");
      return;
    }

    setParsing(true);
    setUploadError("");
    setFile(selected);
    setResumeText("");
    try {
      const text = await extractResumeText(selected);
      setResumeText(text);
      setStep(2);
    } catch (err) {
      console.error("Resume parse error:", err);
      setFile(null);
      setResumeText("");
      setUploadError("Couldn't read this file. Please try a different PDF or DOCX file.");
    } finally {
      setParsing(false);
    }
  };

  const saveAuditLog = async (report: AuditReport) => {
    if (!user?.id) return;
    const { error: saveError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      resume_text: resumeText,
      role_type: roleType,
      company: company.trim() || null,
      overall_score: report.overall_score,
      full_results: report,
    });
    // A failed log shouldn't block the user seeing their audit.
    if (saveError) console.error("Audit log save error:", saveError);
  };

  const analyze = async () => {
    if (!resumeText.trim()) {
      setError("Please upload your resume first.");
      return;
    }
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, roleType, company: company.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to audit resume");

      setResult(data);
      setStep(3);
      saveAuditLog(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const tailorThisResume = () => {
    sessionStorage.setItem("audit_resume_text", resumeText);
    sessionStorage.setItem("audit_company", company.trim());
    router.push("/tailor");
  };

  const downloadReport = () => {
    if (!result) return;

    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      let y = 0;

      const BG: [number, number, number] = [8, 8, 8];
      const ACCENT: [number, number, number] = [232, 255, 71];
      const BODY: [number, number, number] = [240, 240, 240];
      const DIM: [number, number, number] = [153, 153, 153];
      const GREEN: [number, number, number] = [46, 213, 115];
      const RED: [number, number, number] = [255, 71, 87];

      const paintPage = () => {
        doc.setFillColor(...BG);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          paintPage();
          y = margin + 6;
        }
      };

      const statusColor = (status: AuditFlag["status"]): [number, number, number] =>
        status === "good" ? GREEN : status === "warning" ? ACCENT : RED;

      paintPage();
      y = margin + 8;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...ACCENT);
      doc.text("RESUME AUDIT REPORT", margin, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DIM);
      const meta = [
        roleType,
        company.trim() || null,
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ]
        .filter(Boolean)
        .join("  |  ");
      doc.splitTextToSize(meta, maxWidth).forEach((line: string) => {
        doc.text(line, margin, y);
        y += 5;
      });
      y += 1;

      doc.setDrawColor(...ACCENT);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      // Overall score
      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.setTextColor(...statusColor(result.overall_score >= 75 ? "good" : result.overall_score >= 50 ? "warning" : "critical"));
      doc.text(`${result.overall_score}/100`, margin, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DIM);
      doc.text("OVERALL SCORE", margin, y);
      y += 12;

      // Categories
      CATEGORY_LABELS.forEach(({ key, label }) => {
        const category = result[key] as AuditCategory;
        ensureSpace(18);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...ACCENT);
        doc.text(`${label.toUpperCase()}  ${category.score}/25`, margin, y);
        y += 3;
        doc.setDrawColor(40, 40, 40);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        category.flags.forEach((flag) => {
          const marker = flag.status === "good" ? "+" : flag.status === "warning" ? "!" : "x";
          const lines: string[] = doc.splitTextToSize(flag.message, maxWidth - 6);
          ensureSpace(lines.length * 5 + 2);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...statusColor(flag.status));
          doc.text(marker, margin, y);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(...BODY);
          lines.forEach((line: string, i: number) => {
            doc.text(line, margin + 5, y + i * 5);
          });
          y += lines.length * 5 + 2;
        });

        y += 6;
      });

      // Top 3 fixes
      ensureSpace(30);
      const boxTop = y - 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ACCENT);
      doc.text("TOP 3 THINGS TO FIX", margin + 4, y + 6);
      let fixY = y + 14;

      result.top_3_fixes.forEach((fix, i) => {
        const lines: string[] = doc.splitTextToSize(`${i + 1}. ${fix}`, maxWidth - 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...BODY);
        lines.forEach((line: string, j: number) => {
          doc.text(line, margin + 4, fixY + j * 5);
        });
        fixY += lines.length * 5 + 3;
      });

      doc.setDrawColor(...ACCENT);
      doc.rect(margin, boxTop, maxWidth, fixY - boxTop - 1);
      y = fixY + 8;

      ensureSpace(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DIM);
      doc.text("Generated by RezumeAI", margin, y);

      const fileName = `resume-audit-${(company.trim() || roleType).replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(fileName);
    });
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setResumeText("");
    setUploadError("");
    setCompany("");
    setRoleType("Technical");
    setResult(null);
    setError("");
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
          &larr; Back to Dashboard
        </button>

        <div className="tag" style={{ marginBottom: 16 }}>AI Tailor</div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, color: COLORS.text }}>
          Audit your resume
        </h1>
        <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 32 }}>
          Find out what&apos;s holding your resume back before you tailor it.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* STEP 1 — Upload your resume */}
          {step === 1 ? (
            <div className="card" style={{ padding: "32px", animation: "fadeUp 0.4s ease" }}>
              <div className="tag" style={{ marginBottom: 16 }}>Step 1 · Upload your resume</div>
              <input
                type="file"
                id="audit-file-input"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <label htmlFor="audit-file-input" style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 10,
                height: 160, border: `2px dashed ${file ? COLORS.accent : COLORS.border}`,
                cursor: parsing ? "wait" : "pointer",
                transition: "border-color 0.2s",
              }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <span className="mono" style={{ fontSize: 13, color: COLORS.textDim }}>
                  {parsing ? "Reading your resume..." : "Drop PDF or DOCX here · or click to browse"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>
                  PDF or DOCX only
                </span>
              </label>
              {uploadError && (
                <p className="mono" style={{ color: COLORS.danger, fontSize: 12, marginTop: 10 }}>
                  {uploadError}
                </p>
              )}
            </div>
          ) : (
            <div className="card" style={{
              padding: "18px 24px", display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12, flexWrap: "wrap", animation: "fadeIn 0.3s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{file?.name}</span>
                <span className="mono" style={{ fontSize: 12, color: COLORS.success }}>✓ Loaded</span>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setStep(1); setResult(null); setError(""); }}
                style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}
              >
                Change
              </button>
            </div>
          )}

          {/* STEP 2 — Tell us what you're targeting */}
          {step >= 2 && (step === 2 ? (
            <div className="card" style={{ padding: "32px", animation: "fadeUp 0.4s ease" }}>
              <div className="tag" style={{ marginBottom: 16 }}>Step 2 · Tell us what you&apos;re targeting</div>

              {analyzing ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 20, padding: "48px 0",
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: `2px solid ${COLORS.border}`,
                    borderTopColor: COLORS.accent,
                    animation: "spin 1s linear infinite",
                  }} />
                  <div style={{ textAlign: "center" }}>
                    <h2 className="mono" style={{
                      fontSize: 15, fontWeight: 500, color: COLORS.text,
                      animation: "pulse 1.6s ease-in-out infinite",
                    }}>
                      Analyzing your resume...
                    </h2>
                    <p className="mono" style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>
                      Checking structure · ATS parsing · Achievements · Role fit
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="mono" style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>
                    ROLE TYPE
                  </label>
                  <select
                    value={roleType}
                    onChange={e => setRoleType(e.target.value as RoleType)}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14, marginBottom: 16 }}
                  >
                    {ROLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <label className="mono" style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>
                    COMPANY (OPTIONAL)
                  </label>
                  <input
                    placeholder="e.g. Google, Paystack, Flutterwave"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14 }}
                  />

                  <button
                    className="btn-primary"
                    onClick={analyze}
                    disabled={!resumeText.trim()}
                    style={{ width: "100%", padding: "16px", borderRadius: 2, fontSize: 14, marginTop: 20 }}
                  >
                    Analyze my resume →
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{
              padding: "18px 24px", display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12, flexWrap: "wrap", animation: "fadeIn 0.3s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                  {roleType}{company.trim() ? ` — ${company.trim()}` : ""}
                </span>
                <span className="mono" style={{ fontSize: 12, color: COLORS.success }}>✓</span>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setStep(2); setResult(null); }}
                style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}
              >
                Change
              </button>
            </div>
          ))}

          {error && (
            <p className="mono" style={{ color: COLORS.danger, fontSize: 13, marginTop: 4 }}>{error}</p>
          )}

          {/* STEP 3 — Results */}
          {step === 3 && result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, animation: "fadeUp 0.5s ease" }}>

              {/* Overall score */}
              <div className="card" style={{
                padding: "40px 32px", display: "flex", alignItems: "center",
                gap: 32, flexWrap: "wrap",
              }}>
                <div style={{
                  width: 148, height: 148, borderRadius: "50%",
                  border: `3px solid ${scoreColor(result.overall_score)}`,
                  background: `${scoreColor(result.overall_score)}0f`,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em",
                    color: scoreColor(result.overall_score), lineHeight: 1,
                  }}>
                    {result.overall_score}
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                    / 100
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="mono" style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>
                    OVERALL SCORE
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.text, marginBottom: 8 }}>
                    {result.overall_score >= 75
                      ? "Strong resume — sharpen the edges"
                      : result.overall_score >= 50
                        ? "Decent base — real gaps to close"
                        : "This resume is costing you interviews"}
                  </h2>
                  <p className="mono" style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
                    Audited for {roleType.toLowerCase()} roles{company.trim() ? ` at ${company.trim()}` : ""}.
                    Scored across structure, ATS compatibility, achievement quality and role fit.
                  </p>
                </div>
              </div>

              {/* Four category cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {CATEGORY_LABELS.map(({ key, label }) => {
                  const category = result[key] as AuditCategory;
                  return (
                    <div key={key} className="card" style={{ padding: "28px 32px" }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        gap: 12, marginBottom: 20, paddingBottom: 12,
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{label}</span>
                        <span className="mono" style={{
                          fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
                          color: scoreColor((category.score / 25) * 100),
                        }}>
                          {category.score}/25
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {category.flags.map((flag, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.6 }}>
                              {FLAG_ICONS[flag.status]}
                            </span>
                            <span className="mono" style={{
                              fontSize: 12.5, lineHeight: 1.6,
                              color: flag.status === "good" ? COLORS.textDim : flagColor(flag.status),
                            }}>
                              {flag.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top 3 fixes */}
              <div style={{
                border: `1px solid ${COLORS.accent}55`,
                background: `${COLORS.accent}08`,
                padding: "32px",
              }}>
                <div className="tag" style={{
                  marginBottom: 20, color: COLORS.accent,
                  borderColor: `${COLORS.accent}55`, background: `${COLORS.accent}12`,
                }}>
                  Top 3 things to fix
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {result.top_3_fixes.map((fix, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{
                        width: 24, height: 24, flexShrink: 0,
                        background: `${COLORS.accent}18`,
                        border: `1px solid ${COLORS.accent}45`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'DM Mono', monospace", fontSize: 12,
                        fontWeight: 500, color: COLORS.accent,
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.65, paddingTop: 2 }}>
                        {fix}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={tailorThisResume}
                  style={{ padding: "16px", borderRadius: 2, fontSize: 14 }}
                >
                  Tailor this resume for a job →
                </button>
                <button
                  className="btn-ghost"
                  onClick={downloadReport}
                  style={{ padding: "14px", borderRadius: 2, fontSize: 13 }}
                >
                  Download audit report
                </button>
                <button
                  className="btn-ghost"
                  onClick={reset}
                  style={{ padding: "14px", borderRadius: 2, fontSize: 13 }}
                >
                  Audit another resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
