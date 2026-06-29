"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { Resume, TailorResult } from "@/types";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Step = "input" | "analyzing" | "result";
type Mode = "tailor" | "generate";

// Converts a stored structured_data resume (from a previous AI generation)
// into readable plain text, so it can populate the resume text box just like
// an uploaded file's extracted text.
function structuredResumeToText(s: NonNullable<Resume["structured_data"]>): string {
  const lines: string[] = [];

  if (s.name) lines.push(s.name);
  if (s.contact) lines.push(s.contact);
  if (s.summary) lines.push("", "SUMMARY", s.summary);

  if (s.experience?.length) {
    lines.push("", "EXPERIENCE");
    s.experience.forEach(exp => {
      lines.push(`${exp.title} — ${exp.company}`);
      const meta = [exp.location, exp.period].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      exp.bullets?.forEach(b => lines.push(`• ${b}`));
      lines.push("");
    });
  }

  if (s.projects?.length) {
    lines.push("PROJECTS");
    s.projects.forEach(proj => {
      lines.push(proj.period ? `${proj.name} (${proj.period})` : proj.name);
      proj.bullets?.forEach(b => lines.push(`• ${b}`));
      lines.push("");
    });
  }

  if (s.education?.length) {
    lines.push("EDUCATION");
    s.education.forEach(edu => {
      lines.push(edu.school);
      const degree = [edu.degree, edu.gpa ? `GPA: ${edu.gpa}` : ""].filter(Boolean).join(" | ");
      if (degree) lines.push(degree);
      const meta = [edu.location, edu.period].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      lines.push("");
    });
  }

  if (s.skills && Object.keys(s.skills).length) {
    lines.push("SKILLS");
    Object.entries(s.skills).forEach(([category, value]) => lines.push(`${category}: ${value}`));
  }

  return lines.join("\n").trim();
}

export default function Tailor() {
  const router = useRouter();
  const { resumes, setResumes, addApplication, user } = useApp();
  const [mode, setMode] = useState<Mode>("tailor");
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loadedResumeName, setLoadedResumeName] = useState<string | null>(null);
  const [selectedHasNoContent, setSelectedHasNoContent] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<TailorResult & { tailoredResume?: string } | null>(null);
  const [error, setError] = useState("");
  const [profileMissing, setProfileMissing] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState("");
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [showAllResumes, setShowAllResumes] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [resumeInputMode, setResumeInputMode] = useState<"upload" | "paste">("upload");

  const loadCdnScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  const extractPdfText = async (file: File): Promise<string> => {
    const BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build";

    await loadCdnScript(`${BASE}/pdf.min.js`);

    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) throw new Error("PDF library failed to load. Please try again.");

    // Fetch worker as a blob so it runs same-origin — avoids cross-origin worker blocks
    const workerBlob = await fetch(`${BASE}/pdf.worker.min.js`).then(r => r.blob());
    const workerUrl = URL.createObjectURL(workerBlob);
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((item: any) => item.str || "").join(" "));
      }
      return pages.join("\n");
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setResumeText("");
    try {
      const name = file.name.toLowerCase();
      let text = "";

      if (name.endsWith(".txt") || name.endsWith(".rtf")) {
        text = await file.text();
      } else if (name.endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
        await loadCdnScript("https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js");
        const arrayBuffer = await file.arrayBuffer();
        const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        setUploadError("Please upload a PDF, DOCX, or TXT file.");
        return;
      }

      if (!text.trim()) {
        setUploadError("Could not extract text. Try the 'Paste text' option instead.");
        return;
      }

      setUploadedFile(file);
      setResumeText(text.trim());
      // Text now comes from the uploaded file, not a vault resume.
      setLoadedResumeName(null);
      setSelectedHasNoContent(false);
    } catch (err: any) {
      console.error("File parse error:", err);
      setUploadError(err.message || "Failed to read file. Try pasting the text instead.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Selecting a vault resume auto-fills the resume text box from its saved
  // extracted text. Clicking the selected one again toggles it off.
  const selectResume = (r: Resume) => {
    if (selectedResume?.id === r.id) {
      setSelectedResume(null);
      setResumeText("");
      setLoadedResumeName(null);
      setSelectedHasNoContent(false);
      return;
    }

    setSelectedResume(r);
    setUploadedFile(null);
    setResumeInputMode("paste"); // show the textarea so the fill is visible

    // Prefer the uploaded file's extracted text; otherwise fall back to a
    // previously AI-generated resume's structured_data (rendered to plain text).
    const structuredText = r.structured_data
      ? structuredResumeToText(r.structured_data)
      : "";

    if (r.extractedText && r.extractedText.trim()) {
      setResumeText(r.extractedText);
      setLoadedResumeName(r.name);
      setSelectedHasNoContent(false);
    } else if (structuredText) {
      setResumeText(structuredText);
      setLoadedResumeName(r.name);
      setSelectedHasNoContent(false);
    } else {
      // No extracted text and no structured data — keep whatever the user typed.
      setLoadedResumeName(null);
      setSelectedHasNoContent(true);
    }
  };

  // Pre-select a resume when arriving from the vault's "Optimize for a job"
  // button (id passed via localStorage). Runs once after resumes have loaded.
  const preselectApplied = useRef(false);
  useEffect(() => {
    if (preselectApplied.current) return;
    if (resumes.length === 0) return;

    const preselectId = localStorage.getItem("tailor_preselect_resume_id");
    if (!preselectId) return;

    localStorage.removeItem("tailor_preselect_resume_id");
    preselectApplied.current = true;

    const match = resumes.find(r => String(r.id) === preselectId);
    if (match) {
      setMode("tailor");
      selectResume(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumes]);

  const saveToVault = async (data: any) => {
    if (!user?.id) return;
    const date = new Date().toLocaleDateString();
    const resumeName = (company && role) ? `${company} — ${role}` : `Generated CV — ${date}`;
    const { data: saved } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        name: resumeName,
        type: data.jobType || "General",
        notes: `Auto-saved from ${mode === "generate" ? "CV generation" : "resume tailoring"} on ${date}`,
        tailored_count: 1,
        structured_data: data.structured || null,
      })
      .select()
      .single();

    if (saved) {
      setSavedToVault(true);
      setResumes(prev => [{
        id: saved.id,
        name: saved.name,
        type: saved.type,
        notes: saved.notes || "",
        uploaded: new Date(saved.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        tailored: 1,
      }, ...prev]);
    }
  };

  const validateInput = (): string | null => {
    const jd = jobDesc.trim();

    if (jd.length < 100) {
      return "Please paste the full job description — it looks too short to analyze properly.";
    }

    const signalWords = [
      "experience", "responsibilities", "requirements", "skills", "role",
      "qualifications", "degree", "years", "team", "company",
    ];
    const lowerJd = jd.toLowerCase();
    const matches = signalWords.filter(word => lowerJd.includes(word)).length;
    if (matches < 3) {
      return "This doesn't look like a complete job description. Please paste the full posting including responsibilities and requirements.";
    }

    if (mode === "tailor" && resumeText.trim().length < 200) {
      return "Please paste your complete resume text — it looks incomplete.";
    }

    return null;
  };

  const analyze = async () => {
    const validationError = validateInput();
    if (validationError) { setError(validationError); return; }
    setError("");
    setStep("analyzing");

    try {
      const endpoint = mode === "generate" ? "/api/generate-cv" : "/api/tailor";
      const body = mode === "generate"
        ? { jobDescription: jobDesc, userId: user?.id }
        : { jobDescription: jobDesc, resumeText, resumeName: selectedResume?.name || "Resume", resumeId: selectedResume?.id };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 404 && mode === "generate") {
          setProfileMissing(true);
          setStep("input");
          return;
        }
        throw new Error(data.error || "API call failed");
      }

      const data = await res.json();
      setResult(data);
      setStep("result");
      saveToVault(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("input");
    }
  };

  const downloadResume = () => {
    if (!result) return;

    import("jspdf").then(({ jsPDF }) => {
      const s = result.structured;

      const renderContent = (doc: any, multiplier: number): number => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 12;
        const maxWidth = pageWidth - margin * 2;
        let y = 14;

        // Base spacing constants — multiplied by scale factor
        const lhBody = 4.2 * multiplier;
        const lhSm = 3.8 * multiplier;
        const secGap = 3.5 * multiplier;
        const bGap = 4.0 * multiplier;
        const rGap = 3.0 * multiplier;

        const addSectionHeader = (title: string) => {
          y += secGap;
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(title.toUpperCase(), margin, y);
          y += 2.5;
          doc.setDrawColor(0, 0, 0);
          doc.line(margin, y, pageWidth - margin, y);
          y += 4 * multiplier;
        };

        if (s) {
          doc.setFontSize(15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(s.name, margin, y);
          y += 5.5 * multiplier;

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          const contactLines = doc.splitTextToSize(s.contact, maxWidth);
          contactLines.forEach((line: string) => {
            doc.text(line, margin, y);
            y += lhSm;
          });
          y += 1.5 * multiplier;

          doc.setDrawColor(0, 0, 0);
          doc.line(margin, y, pageWidth - margin, y);
          y += 4 * multiplier;

          addSectionHeader("Professional Summary");
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          const summaryLines = doc.splitTextToSize(s.summary, maxWidth);
          summaryLines.forEach((line: string) => {
            doc.text(line, margin, y);
            y += lhBody;
          });

          if (s.experience?.length > 0) {
            addSectionHeader("Work Experience");
            s.experience.forEach((exp: any, idx: number) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(0, 0, 0);
              doc.text(`${exp.title} — ${exp.company}`, margin, y);
              y += 4 * multiplier;

              doc.setFontSize(8.5);
              doc.setFont("helvetica", "italic");
              doc.setTextColor(90, 90, 90);
              doc.text(`${exp.location} | ${exp.period}`, margin, y);
              y += 4 * multiplier;

              exp.bullets?.forEach((bullet: string) => {
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
                const lines = doc.splitTextToSize(`• ${bullet}`, maxWidth - 4);
                lines.forEach((line: string) => {
                  doc.text(line, margin + 2, y);
                  y += bGap;
                });
              });

              if (idx < s.experience.length - 1) y += rGap;
            });
          }

          if (s.projects?.length > 0) {
            addSectionHeader("Projects");
            s.projects.forEach((proj: any, idx: number) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(0, 0, 0);
              doc.text(`${proj.name}${proj.period ? ` (${proj.period})` : ""}`, margin, y);
              y += 4 * multiplier;

              proj.bullets?.forEach((bullet: string) => {
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
                const lines = doc.splitTextToSize(`• ${bullet}`, maxWidth - 4);
                lines.forEach((line: string) => {
                  doc.text(line, margin + 2, y);
                  y += bGap;
                });
              });

              if (idx < s.projects.length - 1) y += rGap;
            });
          }

          if (s.education?.length > 0) {
            addSectionHeader("Education");
            s.education.forEach((edu: any) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(0, 0, 0);
              doc.text(edu.school, margin, y);
              y += 4 * multiplier;

              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(0, 0, 0);
              doc.text(`${edu.degree}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`, margin, y);
              y += lhSm;

              doc.setFontSize(8.5);
              doc.setTextColor(90, 90, 90);
              doc.text(`${edu.location} | ${edu.period}`, margin, y);
              y += 4 * multiplier;
            });
          }

          if (s.skills) {
            addSectionHeader("Skills");
            Object.entries(s.skills).forEach(([category, value]) => {
              doc.setFontSize(9);
              doc.setTextColor(0, 0, 0);
              const skillLine = `${category}: ${value}`;
              const lines = doc.splitTextToSize(skillLine, maxWidth);
              lines.forEach((line: string, i: number) => {
                if (i === 0) doc.setFont("helvetica", "bold");
                else doc.setFont("helvetica", "normal");
                doc.text(line, margin, y);
                y += lhBody;
              });
            });
          }
        } else {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(selectedResume?.name || "Tailored Resume", margin, y);
          y += 8 * multiplier;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(result.tailoredResume || "", maxWidth);
          lines.forEach((line: string) => {
            doc.text(line, margin, y);
            y += lhBody;
          });
        }

        return y;
      };

      // First pass — measure content height with multiplier 1.0
      const measureDoc = new jsPDF({ format: "a4", unit: "mm" });
      const contentHeight = renderContent(measureDoc, 1.0);

      // Scale to fill page: 297mm - 14mm top - 10mm bottom = 273mm usable
      const usableHeight = 273;
      const scaleFactor = Math.min(usableHeight / contentHeight, 1.8);

      // Second pass — render with computed scale factor
      const finalDoc = new jsPDF({ format: "a4", unit: "mm" });
      renderContent(finalDoc, scaleFactor);

      finalDoc.save(`${s?.name || selectedResume?.name || "resume"}-tailored.pdf`);
    });
  };

    const logApplication = () => {
    if (!result) return;
    downloadResume();

    const date = new Date().toLocaleDateString();
    addApplication({
      id: Date.now(),
      company: company || "Unnamed Company",
      role: role || "Unknown Role",
      status: "Applied",
      resumeUsed: mode === "generate" ? "Generated CV" : (selectedResume?.name || "Unknown"),
      date,
      matchScore: result.matchScore,
      notes: "",
    });

    setTimeout(() => {
      setStep("input");
      setJobDesc(""); setCompany(""); setRole("");
      setResult(null); setSelectedResume(null); setResumeText("");
      setLoadedResumeName(null); setSelectedHasNoContent(false);
      setSavedToVault(false);
      setUploadedFile(null); setUploadError("");
      setCoverLetter(""); setCoverLetterData(null); setCoverLetterGenerated(false); setCoverLetterError("");
    }, 1500);
  };

  const generateCoverLetter = async () => {
    setCoverLetterLoading(true);
    setCoverLetterError("");
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDesc,
          userId: user?.id,
          company,
          role,
          structured: result?.structured,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setCoverLetter(data.coverLetter);
      setCoverLetterData(data);
      setCoverLetterGenerated(true);
    } catch (err: any) {
      setCoverLetterError(err.message);
    } finally {
      setCoverLetterLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
  };

  const downloadCoverLetterPDF = () => {
    if (!coverLetterData) return;

    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 12;
      const maxWidth = pageWidth - margin * 2;
      let y = 18;

      const name: string = coverLetterData.name || result?.structured?.name || "";
      const contact: string = coverLetterData.contact || "";
      const location: string = coverLetterData.location || "";
      const date: string = coverLetterData.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const recipient: string = coverLetterData.recipient || "Hiring Team";
      const companyName: string = coverLetterData.company || company || "";
      const salutation: string = coverLetterData.salutation || `Dear ${recipient},`;
      const paragraphs: string[] = Array.isArray(coverLetterData.paragraphs)
        ? coverLetterData.paragraphs
        : coverLetter.split(/\n\n+/);
      const signature: string = coverLetterData.signature || name;

      // Header — name
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(name, margin, y);
      y += 6;

      // Contact line
      if (contact) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.splitTextToSize(contact, maxWidth).forEach((line: string) => {
          doc.text(line, margin, y);
          y += 4.5;
        });
      }

      // Location line
      if (location) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(location, margin, y);
        y += 4.5;
      }

      // Divider under header
      y += 3;
      doc.setDrawColor(0, 0, 0);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Date
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(date, margin, y);
      y += 9;

      // Recipient / company block
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(recipient, margin, y);
      y += 5;
      if (companyName) {
        doc.setFont("helvetica", "normal");
        doc.text(companyName, margin, y);
        y += 5;
      }
      y += 4;

      // Salutation
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(salutation, margin, y);
      y += 8;

      // Body paragraphs
      paragraphs.forEach((para: string) => {
        const paraLines = doc.splitTextToSize(para.trim(), maxWidth);
        paraLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 5.5;
        });
        y += 3.5;
      });

      // Signature
      y += 2;
      doc.text("Sincerely,", margin, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text(signature, margin, y);

      const fileName = ((companyName || "cover-letter") + "-" + (role || "application")).replace(/\s+/g, "-").toLowerCase();
      doc.save(fileName + "-cover-letter.pdf");
    });
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
              onClick={() => { setMode("tailor"); setError(""); setProfileMissing(false); }}
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
              onClick={() => { setMode("generate"); setError(""); setProfileMissing(false); }}
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

            {mode === "generate" ? (
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
                        ) : (showAllResumes ? resumes : resumes.slice(0, 6)).map(r => (
                          <div key={r.id} onClick={() => selectResume(r)} style={{
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
                      {resumes.length > 6 && (
                        <button
                          onClick={() => setShowAllResumes(v => !v)}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: COLORS.accent, fontSize: 12, fontFamily: "'DM Mono', monospace",
                            marginTop: 12, padding: 0, alignSelf: "flex-start",
                          }}
                        >
                          {showAllResumes ? "Show less" : `View all (${resumes.length})`}
                        </button>
                      )}
                    </div>
                    <button className="btn-primary" onClick={analyze} disabled={!jobDesc || !resumeText}
                      style={{ padding: "20px", borderRadius: 2, fontSize: 15 }}>
                      Analyze & tailor &rarr;
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: "32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div className="tag">Your resume</div>
                      {loadedResumeName && (
                        <span className="tag" style={{
                          color: COLORS.accent,
                          borderColor: `${COLORS.accent}55`,
                          background: `${COLORS.accent}12`,
                        }}>
                          Loaded from: {loadedResumeName}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {(["upload", "paste"] as const).map(m => (
                        <button key={m} onClick={() => setResumeInputMode(m)} style={{
                          padding: "6px 14px", fontSize: 12, cursor: "pointer", borderRadius: 2,
                          fontFamily: "'Syne', sans-serif", fontWeight: 600,
                          background: resumeInputMode === m ? COLORS.accent : "transparent",
                          color: resumeInputMode === m ? "#080808" : COLORS.textDim,
                          border: `1px solid ${resumeInputMode === m ? COLORS.accent : COLORS.border}`,
                        }}>
                          {m === "upload" ? "Upload file" : "Paste text"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedHasNoContent && (
                    <p className="mono" style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                      This resume has no saved content — please paste your resume text manually below.
                    </p>
                  )}

                  {resumeInputMode === "upload" ? (
                    uploadedFile ? (
                      <>
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", background: `${COLORS.success}10`,
                          border: `1px solid ${COLORS.success}30`, marginBottom: 12,
                        }}>
                          <span className="mono" style={{ fontSize: 12, color: COLORS.success }}>
                            ✓ {uploadedFile.name}
                          </span>
                          <button onClick={() => { setUploadedFile(null); setResumeText(""); }} style={{
                            background: "transparent", border: "none", color: COLORS.textDim,
                            fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                          }}>
                            Change file
                          </button>
                        </div>
                        <textarea
                          value={resumeText} onChange={e => setResumeText(e.target.value)}
                          style={{
                            width: "100%", height: 200, padding: "14px 16px", borderRadius: 2,
                            fontSize: 12, lineHeight: 1.7, resize: "none",
                            fontFamily: "'DM Mono', monospace",
                          }} />
                      </>
                    ) : (
                      <>
                        <input
                          type="file" id="resume-file-input"
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                        <label htmlFor="resume-file-input" style={{
                          display: "flex", flexDirection: "column", alignItems: "center",
                          justifyContent: "center", gap: 10,
                          height: 160, border: `2px dashed ${COLORS.border}`,
                          cursor: uploading ? "wait" : "pointer",
                          transition: "border-color 0.2s",
                        }}>
                          <span style={{ fontSize: 28 }}>📄</span>
                          <span className="mono" style={{ fontSize: 13, color: COLORS.textDim }}>
                            {uploading ? "Extracting text..." : "Click to upload your resume"}
                          </span>
                          <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>
                            PDF, DOCX, or TXT
                          </span>
                        </label>
                        {uploadError && (
                          <p className="mono" style={{ color: COLORS.danger, fontSize: 12, marginTop: 10 }}>
                            {uploadError}
                          </p>
                        )}
                      </>
                    )
                  ) : (
                    <textarea
                      placeholder="Paste your full resume text here..."
                      value={resumeText} onChange={e => setResumeText(e.target.value)}
                      style={{
                        width: "100%", height: 200, padding: "14px 16px", borderRadius: 2,
                        fontSize: 13, lineHeight: 1.7, resize: "none",
                        fontFamily: "'DM Mono', monospace",
                      }} />
                  )}
                </div>
              </>
            )}

            {profileMissing && (
              <div style={{
                border: `1px solid ${COLORS.accent}30`, background: `${COLORS.accent}06`,
                padding: "32px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>👤</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
                  Your profile isn&apos;t set up yet
                </h3>
                <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                  Generate mode builds a CV from your saved experience.<br />
                  Fill in your profile first — it only takes a few minutes.
                </p>
                <button className="btn-primary" onClick={() => router.push("/profile")}
                  style={{ padding: "12px 28px", borderRadius: 2 }}>
                  Complete your profile →
                </button>
              </div>
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
                  <div className="mono" style={{ fontSize: 11, color: savedToVault ? COLORS.success : COLORS.textMuted, marginBottom: 4 }}>
                    {savedToVault ? "✓ Saved to resume vault" : "Saving to vault..."}
                  </div>
                  <button className="btn-primary" onClick={logApplication} disabled={!savedToVault} style={{ padding: "14px", borderRadius: 2 }}>
                    Download & log application →
                  </button>
                  <button className="btn-ghost" onClick={downloadResume} style={{ padding: "12px", borderRadius: 2 }}>
                    Download PDF only
                  </button>
                  <button className="btn-ghost" onClick={() => { setStep("input"); setResumeText(""); setSelectedResume(null); setLoadedResumeName(null); setSelectedHasNoContent(false); setUploadedFile(null); setUploadError(""); setCoverLetter(""); setCoverLetterData(null); setCoverLetterGenerated(false); setCoverLetterError(""); }} style={{ padding: "12px", borderRadius: 2 }}>
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
                          {exp.bullets?.map((b, j) => <div key={j}>• {b}</div>)}
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
                          {proj.bullets?.map((b, j) => <div key={j}>• {b}</div>)}
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

            <div className="card" style={{ padding: "32px", marginTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div className="tag">Cover Letter</div>
                {!coverLetterGenerated && (
                  <button
                    onClick={generateCoverLetter}
                    disabled={coverLetterLoading}
                    className="btn-primary"
                    style={{ padding: "10px 24px", borderRadius: 2, fontSize: 13 }}
                  >
                    {coverLetterLoading ? "Writing..." : "Generate cover letter →"}
                  </button>
                )}
              </div>
              {!coverLetterGenerated && !coverLetterLoading && (
                <p className="mono" style={{ color: COLORS.textDim, fontSize: 13 }}>
                  Generate a tailored cover letter for this role using your profile and the job description.
                </p>
              )}
              {coverLetterLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 1s linear infinite" }} />
                  <span className="mono" style={{ fontSize: 13, color: COLORS.textDim }}>Writing your cover letter...</span>
                </div>
              )}
              {coverLetterError && (
                <p className="mono" style={{ color: COLORS.danger, fontSize: 13 }}>{coverLetterError}</p>
              )}
              {coverLetterGenerated && coverLetter && (
                <div>
                  <div style={{
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    padding: "24px", borderRadius: 2, marginBottom: 16,
                    fontFamily: "'DM Mono', monospace", fontSize: 13,
                    color: COLORS.textDim, lineHeight: 1.8, whiteSpace: "pre-wrap",
                  }}>
                    {coverLetter}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={copyToClipboard} className="btn-ghost" style={{ padding: "10px 20px", borderRadius: 2, fontSize: 13 }}>
                      Copy to clipboard
                    </button>
                    <button onClick={downloadCoverLetterPDF} className="btn-primary" style={{ padding: "10px 20px", borderRadius: 2, fontSize: 13 }}>
                      Download PDF →
                    </button>
                    <button onClick={() => { setCoverLetterGenerated(false); setCoverLetter(""); setCoverLetterData(null); }} className="btn-ghost" style={{ padding: "10px 20px", borderRadius: 2, fontSize: 13 }}>
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}