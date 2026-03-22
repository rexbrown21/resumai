"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { Resume, TailorResult } from "@/types";
import AuthGuard from "@/components/AuthGuard";

type Step = "input" | "analyzing" | "result";
type Mode = "tailor" | "generate";

export default function Tailor() {
  const router = useRouter();
  const { resumes, addApplication, user } = useApp();
  const [mode, setMode] = useState<Mode>("tailor");
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<TailorResult & { tailoredResume?: string } | null>(null);
  const [error, setError] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [fetching, setFetching] = useState(false);

  const analyze = async () => {
    if (!jobDesc) { setError("Please add a job description."); return; }
    if (mode === "tailor" && !resumeText) { setError("Please paste your resume text below."); return; }
    setError("");
    setStep("analyzing");

    try {
      const endpoint = mode === "generate" ? "/api/generate-cv" : "/api/tailor";
      const body = mode === "generate"
        ? { jobDescription: jobDesc, userId: user?.id }
        : { jobDescription: jobDesc, resumeText, resumeName: selectedResume?.name || "Resume" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "API call failed");
      }

      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("input");
    }
  };

  const fetchJobFromUrl = async () => {
    if (!jobUrl) return;
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not fetch this page. Paste the job description manually.");
      } else {
        setJobDesc(data.jobDescription);
        setError("");
      }
    } catch {
      setError("Could not fetch this page. Paste the job description manually.");
    } finally {
      setFetching(false);
    }
  };

  const downloadResume = () => {
    if (!result) return;

    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPage = () => {
        if (y > 275) { doc.addPage(); y = 20; }
      };

      const addSectionHeader = (title: string) => {
        y += 4;
        checkPage();
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(title.toUpperCase(), margin, y);
        y += 3;
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      const s = result.structured;

      if (s) {
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(s.name, margin, y);
        y += 7;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const contactLines = doc.splitTextToSize(s.contact, maxWidth);
        contactLines.forEach((line: string) => {
          checkPage();
          doc.text(line, margin, y);
          y += 4;
        });
        y += 2;

        doc.setDrawColor(0, 0, 0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        addSectionHeader("Professional Summary");
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const summaryLines = doc.splitTextToSize(s.summary, maxWidth);
        summaryLines.forEach((line: string) => {
          checkPage();
          doc.text(line, margin, y);
          y += 5;
        });

        if (s.experience?.length > 0) {
          addSectionHeader("Work Experience");
          s.experience.forEach((exp: any) => {
            checkPage();
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(`${exp.title} - ${exp.company}`, margin, y);
            y += 5;

            checkPage();
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 100, 100);
            doc.text(`${exp.location} | ${exp.period}`, margin, y);
            y += 5;

            exp.bullets?.forEach((bullet: string) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(0, 0, 0);
              const lines = doc.splitTextToSize(`- ${bullet}`, maxWidth - 4);
              lines.forEach((line: string) => {
                checkPage();
                doc.text(line, margin + 2, y);
                y += 5;
              });
            });
            y += 3;
          });
        }

        if (s.projects?.length > 0) {
          addSectionHeader("Projects");
          s.projects.forEach((proj: any) => {
            checkPage();
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(`${proj.name}${proj.period ? ` (${proj.period})` : ""}`, margin, y);
            y += 5;

            proj.bullets?.forEach((bullet: string) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(0, 0, 0);
              const lines = doc.splitTextToSize(`- ${bullet}`, maxWidth - 4);
              lines.forEach((line: string) => {
                checkPage();
                doc.text(line, margin + 2, y);
                y += 5;
              });
            });
            y += 3;
          });
        }

        if (s.education?.length > 0) {
          addSectionHeader("Education");
          s.education.forEach((edu: any) => {
            checkPage();
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(edu.school, margin, y);
            y += 5;

            checkPage();
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${edu.degree}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`, margin, y);
            y += 4;

            checkPage();
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`${edu.location} | ${edu.period}`, margin, y);
            y += 7;
          });
        }

        if (s.skills) {
          addSectionHeader("Skills");
          Object.entries(s.skills).forEach(([category, value]) => {
            checkPage();
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const skillLine = `${category}: ${value}`;
            const lines = doc.splitTextToSize(skillLine, maxWidth);
            lines.forEach((line: string, i: number) => {
              if (i === 0) doc.setFont("helvetica", "bold");
              else doc.setFont("helvetica", "normal");
              checkPage();
              doc.text(line, margin, y);
              y += 5;
            });
          });
        }

      } else {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(selectedResume?.name || "Tailored Resume", margin, y);
        y += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(result.tailoredResume || "", maxWidth);
        lines.forEach((line: string) => {
          checkPage();
          doc.text(line, margin, y);
          y += 6;
        });
      }

      doc.save(`${s?.name || selectedResume?.name || "resume"}-tailored.pdf`);
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
      resumeUsed: mode === "generate" ? "Generated CV" : (selectedResume?.name || "Unknown"),
      date: new Date().toLocaleDateString(),
      matchScore: result.matchScore,
      notes: "",
    });
    setStep("input");
    setJobDesc(""); setCompany(""); setRole("");
    setResult(null); setSelectedResume(null); setResumeText("");
  };

  const backButton = (
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
  );

  return (
    <AuthGuard>
      <div style={{ padding: "100px 60px 60px", maxWidth: 1200, margin: "0 auto" }}>
        {step !== "analyzing" && backButton}

        <div className="tag" style={{ marginBottom: 16 }}>AI Tailor</div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 24, color: COLORS.text }}>
          {mode === "generate" ? "Generate a CV" : "Tailor your resume"}
        </h1>

        {/* Mode toggle */}
        {step === "input" && (
          <div style={{ display: "flex", gap: 2, marginBottom: 32 }}>
            <button
              onClick={() => { setMode("tailor"); setError(""); }}
              style={{
                padding: "10px 24px", borderRadius: 2, fontSize: 13, cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                background: mode === "tailor" ? COLORS.accent : "transparent",
                color: mode === "tailor" ? "#080808" : COLORS.textDim,
                border: `1px solid ${mode === "tailor" ? COLORS.accent : COLORS.border}`,
                transition: "all 0.2s",
              }}
            >
              ✦ Tailor existing resume
            </button>
            <button
              onClick={() => { setMode("generate"); setError(""); }}
              style={{
                padding: "10px 24px", borderRadius: 2, fontSize: 13, cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                background: mode === "generate" ? COLORS.accent : "transparent",
                color: mode === "generate" ? "#080808" : COLORS.textDim,
                border: `1px solid ${mode === "generate" ? COLORS.accent : COLORS.border}`,
                transition: "all 0.2s",
              }}
            >
              ⚡ Generate from profile
            </button>
          </div>
        )}

        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* URL Fetch */}
            <div className="card" style={{ padding: "32px" }}>
              <div className="tag" style={{ marginBottom: 16 }}>
                Fetch from URL <span style={{ color: COLORS.accent, marginLeft: 6 }}>beta</span>
              </div>
              <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
                Paste a job posting link and we'll extract the description automatically.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="https://jobs.lever.co/company/job-id"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchJobFromUrl()}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 2, fontSize: 13, fontFamily: "'DM Mono', monospace" }}
                />
                <button
                  onClick={fetchJobFromUrl}
                  disabled={!jobUrl || fetching}
                  className="btn-primary"
                  style={{ padding: "12px 20px", borderRadius: 2, fontSize: 13, whiteSpace: "nowrap" }}
                >
                  {fetching ? "Fetching..." : "Fetch →"}
                </button>
              </div>
              {jobDesc && !error && (
                <p className="mono" style={{ color: COLORS.success, fontSize: 11, marginTop: 8 }}>
                  ✓ Job description fetched — review below and edit if needed
                </p>
              )}
            </div>

            {mode === "generate" ? (
              /* Generate mode — just JD + button */
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <div className="card" style={{ padding: "32px" }}>
                    <div className="tag" style={{ marginBottom: 16 }}>Job details</div>
                    <input placeholder="Company name" value={company}
                      onChange={e => setCompany(e.target.value)}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14, marginBottom: 10 }} />
                    <input placeholder="Role title" value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 2, fontSize: 14 }} />
                  </div>
                  <div className="card" style={{ padding: "32px", background: `${COLORS.accent}06`, border: `1px solid ${COLORS.accent}20` }}>
                    <div className="tag" style={{ marginBottom: 12 }}>Using your profile</div>
                    <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.7 }}>
                      AI will read your saved experience profile and generate a complete ATS resume tailored to this job from scratch.
                    </p>
                    <button
                      className="btn-ghost"
                      onClick={() => router.push("/profile")}
                      style={{ padding: "8px 16px", borderRadius: 2, fontSize: 12, marginTop: 16 }}
                    >
                      Edit profile →
                    </button>
                  </div>
                </div>
                <div className="card" style={{ padding: "32px" }}>
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
                <button className="btn-primary" onClick={analyze} disabled={!jobDesc}
                  style={{ padding: "20px", borderRadius: 2, fontSize: 15 }}>
                  Generate CV &rarr;
                </button>
              </div>
            ) : (
              /* Tailor mode — existing flow */
              <>
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
                            background: selectedResume?.id === r.id ? `${COLORS.accent}08` : "var(--surface-2)",
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
                      Analyze & tailor &rarr;
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
              </>
            )}

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
                {mode === "generate" ? "Generating your CV" : "Analyzing job description"}
              </h2>
              <p className="mono" style={{ color: COLORS.textDim, fontSize: 13 }}>
                {mode === "generate"
                  ? "Reading your profile · Matching to job · Writing bullets..."
                  : "Classifying role · Identifying keywords · Optimizing resume..."}
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
                  <div className="tag" style={{ marginBottom: 20 }}>
                    {mode === "generate" ? "Generated from profile" : "Resume used"}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: COLORS.text }}>
                    {mode === "generate" ? "Experience Profile" : (selectedResume?.name || "Auto-selected")}
                  </div>
                  <div className="mono" style={{ color: COLORS.textDim, fontSize: 13 }}>
                    {mode === "generate" ? "Fresh CV · " : `Type: ${selectedResume?.type} · `}
                    Tailored for {company || "this role"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
                  <button className="btn-primary" onClick={logApplication} style={{ padding: "14px", borderRadius: 2 }}>
                    Download & log application &rarr;
                  </button>
                  <button className="btn-ghost" onClick={downloadResume} style={{ padding: "12px", borderRadius: 2 }}>
                    Download PDF only
                  </button>
                  <button className="btn-ghost" onClick={() => setStep("input")} style={{ padding: "12px", borderRadius: 2 }}>
                    {mode === "generate" ? "Generate another" : "Tailor another"}
                  </button>
                </div>
              </div>
            </div>

            {result.structured && (
              <div className="card" style={{ padding: "32px" }}>
                <div className="tag" style={{ marginBottom: 20 }}>
                  {mode === "generate" ? "Generated CV preview" : "Tailored resume preview"}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textDim, lineHeight: 1.8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{result.structured.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 16 }}>{result.structured.contact}</div>

                  {result.structured.summary && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, letterSpacing: "0.1em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 10 }}>PROFESSIONAL SUMMARY</div>
                      <p style={{ marginBottom: 16 }}>{result.structured.summary}</p>
                    </>
                  )}

                  {result.structured.experience?.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, letterSpacing: "0.1em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 10 }}>WORK EXPERIENCE</div>
                      {result.structured.experience.map((exp, i) => (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, color: COLORS.text }}>{exp.title} — {exp.company}</div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>{exp.location} | {exp.period}</div>
                          {exp.bullets?.map((b, j) => <div key={j}>- {b}</div>)}
                        </div>
                      ))}
                    </>
                  )}

                  {result.structured.projects?.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, letterSpacing: "0.1em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 16 }}>PROJECTS</div>
                      {result.structured.projects.map((proj, i) => (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, color: COLORS.text }}>{proj.name} {proj.period && `(${proj.period})`}</div>
                          {proj.bullets?.map((b, j) => <div key={j}>- {b}</div>)}
                        </div>
                      ))}
                    </>
                  )}

                  {result.structured.education?.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, letterSpacing: "0.1em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 16 }}>EDUCATION</div>
                      {result.structured.education.map((edu, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: COLORS.text }}>{edu.school}</div>
                          <div>{edu.degree}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{edu.location} | {edu.period}</div>
                        </div>
                      ))}
                    </>
                  )}

                  {result.structured.skills && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, letterSpacing: "0.1em", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 16 }}>SKILLS</div>
                      {Object.entries(result.structured.skills).map(([cat, val]) => (
                        <div key={cat}><span style={{ color: COLORS.text, fontWeight: 600 }}>{cat}:</span> {val as string}</div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}