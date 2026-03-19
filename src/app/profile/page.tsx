"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

interface WorkExperience {
  title: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}

interface Project {
  name: string;
  period: string;
  bullets: string[];
}

interface Education {
  degree: string;
  school: string;
  location: string;
  period: string;
  gpa: string;
}

interface ProfileData {
  name: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: WorkExperience[];
  projects: Project[];
  education: Education[];
  skills: { category: string; values: string }[];
}

const emptyProfile: ProfileData = {
  name: "", location: "", email: "", phone: "", linkedin: "", github: "", summary: "",
  experience: [],
  projects: [],
  education: [],
  skills: [],
};

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useApp();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles_data")
      .select("profile")
      .eq("user_id", user.id)
      .single();

    if (data?.profile) setProfile(data.profile);
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles_data")
      .upsert({ user_id: user.id, profile, updated_at: new Date().toISOString() });

    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const addExperience = () => setProfile(p => ({
    ...p, experience: [...p.experience, { title: "", company: "", location: "", period: "", bullets: [""] }]
  }));

  const updateExperience = (i: number, field: keyof WorkExperience, value: string | string[]) =>
    setProfile(p => ({ ...p, experience: p.experience.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }));

  const removeExperience = (i: number) =>
    setProfile(p => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const addProject = () => setProfile(p => ({
    ...p, projects: [...p.projects, { name: "", period: "", bullets: [""] }]
  }));

  const updateProject = (i: number, field: keyof Project, value: string | string[]) =>
    setProfile(p => ({ ...p, projects: p.projects.map((proj, idx) => idx === i ? { ...proj, [field]: value } : proj) }));

  const removeProject = (i: number) =>
    setProfile(p => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }));

  const addEducation = () => setProfile(p => ({
    ...p, education: [...p.education, { degree: "", school: "", location: "", period: "", gpa: "" }]
  }));

  const updateEducation = (i: number, field: keyof Education, value: string) =>
    setProfile(p => ({ ...p, education: p.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }));

  const removeEducation = (i: number) =>
    setProfile(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addSkill = () => setProfile(p => ({ ...p, skills: [...p.skills, { category: "", values: "" }] }));

  const updateSkill = (i: number, field: "category" | "values", value: string) =>
    setProfile(p => ({ ...p, skills: p.skills.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  const removeSkill = (i: number) =>
    setProfile(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 2, fontSize: 13 };
  const labelStyle = { fontSize: 11, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted, marginBottom: 6, display: "block" as const, letterSpacing: "0.05em" };

  if (loading) return (
    <div style={{ padding: "100px 60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="mono" style={{ color: COLORS.textDim }}>Loading profile...</p>
    </div>
  );

  return (
    <AuthGuard>
    <div style={{ padding: "100px 60px 80px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/dashboard")} style={{
        background: "transparent", border: "none", color: COLORS.textDim,
        fontSize: 13, fontFamily: "'DM Mono', monospace", cursor: "pointer",
        marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 6,
      }}>
        &larr; Back to Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
        <div>
          <div className="tag" style={{ marginBottom: 16 }}>Experience Profile</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", color: COLORS.text }}>
            Your profile
          </h1>
          <p className="mono" style={{ color: COLORS.textDim, fontSize: 13, marginTop: 8 }}>
            Fill this in once. AI uses it to generate tailored CVs from scratch.
          </p>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="btn-primary"
          style={{ padding: "12px 28px", borderRadius: 2, marginTop: 24 }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save profile →"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

        {/* Personal Info */}
        <div className="card" style={{ padding: "32px" }}>
          <div className="tag" style={{ marginBottom: 24 }}>Personal info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "FULL NAME", field: "name" as const },
              { label: "LOCATION", field: "location" as const },
              { label: "EMAIL", field: "email" as const },
              { label: "PHONE", field: "phone" as const },
              { label: "LINKEDIN URL", field: "linkedin" as const },
              { label: "GITHUB URL", field: "github" as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input
                  value={profile[field] as string}
                  onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>PROFESSIONAL SUMMARY (optional)</label>
            <textarea
              value={profile.summary}
              onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))}
              placeholder="A brief 2-3 sentence summary of your professional background..."
              style={{ ...inputStyle, height: 80, resize: "none", fontFamily: "'DM Mono', monospace", fontSize: 12 }}
            />
          </div>
        </div>

        {/* Work Experience */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div className="tag">Work experience</div>
            <button onClick={addExperience} className="btn-ghost" style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>
              + Add role
            </button>
          </div>
          {profile.experience.length === 0 ? (
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>No experience added yet.</p>
          ) : profile.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < profile.experience.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>ROLE {i + 1}</span>
                <button onClick={() => removeExperience(i)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[
                  { label: "JOB TITLE", field: "title" as const },
                  { label: "COMPANY", field: "company" as const },
                  { label: "LOCATION", field: "location" as const },
                  { label: "PERIOD (e.g. Jan 2023 - Present)", field: "period" as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label style={labelStyle}>{label}</label>
                    <input value={exp[field] as string} onChange={e => updateExperience(i, field, e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
              <label style={labelStyle}>BULLET POINTS (one per line)</label>
              <textarea
                value={exp.bullets.join("\n")}
                onChange={e => updateExperience(i, "bullets", e.target.value.split("\n"))}
                placeholder="- Increased revenue by 40% through automation&#10;- Led cross-functional team of 8 engineers"
                style={{ ...inputStyle, height: 100, resize: "none", fontFamily: "'DM Mono', monospace", fontSize: 12 }}
              />
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div className="tag">Projects</div>
            <button onClick={addProject} className="btn-ghost" style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>
              + Add project
            </button>
          </div>
          {profile.projects.length === 0 ? (
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>No projects added yet.</p>
          ) : profile.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < profile.projects.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>PROJECT {i + 1}</span>
                <button onClick={() => removeProject(i)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>PROJECT NAME</label>
                  <input value={proj.name} onChange={e => updateProject(i, "name", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>PERIOD (e.g. 2024)</label>
                  <input value={proj.period} onChange={e => updateProject(i, "period", e.target.value)} style={inputStyle} />
                </div>
              </div>
              <label style={labelStyle}>BULLET POINTS (one per line)</label>
              <textarea
                value={proj.bullets.join("\n")}
                onChange={e => updateProject(i, "bullets", e.target.value.split("\n"))}
                placeholder="- Built with Next.js and Supabase&#10;- 500+ active users"
                style={{ ...inputStyle, height: 80, resize: "none", fontFamily: "'DM Mono', monospace", fontSize: 12 }}
              />
            </div>
          ))}
        </div>

        {/* Education */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div className="tag">Education</div>
            <button onClick={addEducation} className="btn-ghost" style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>
              + Add education
            </button>
          </div>
          {profile.education.length === 0 ? (
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>No education added yet.</p>
          ) : profile.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < profile.education.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: COLORS.textMuted }}>EDUCATION {i + 1}</span>
                <button onClick={() => removeEducation(i)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "DEGREE", field: "degree" as const },
                  { label: "SCHOOL", field: "school" as const },
                  { label: "LOCATION", field: "location" as const },
                  { label: "PERIOD", field: "period" as const },
                  { label: "GPA (optional)", field: "gpa" as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label style={labelStyle}>{label}</label>
                    <input value={edu[field]} onChange={e => updateEducation(i, field, e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div className="tag">Skills</div>
            <button onClick={addSkill} className="btn-ghost" style={{ padding: "6px 16px", borderRadius: 2, fontSize: 12 }}>
              + Add category
            </button>
          </div>
          <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 16 }}>
            e.g. Category: "Languages" → Values: "Python, TypeScript, JavaScript"
          </p>
          {profile.skills.length === 0 ? (
            <p className="mono" style={{ color: COLORS.textMuted, fontSize: 13 }}>No skills added yet.</p>
          ) : profile.skills.map((skill, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, marginBottom: 10, alignItems: "end" }}>
              <div>
                <label style={labelStyle}>CATEGORY</label>
                <input value={skill.category} onChange={e => updateSkill(i, "category", e.target.value)} placeholder="Languages" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>VALUES</label>
                <input value={skill.values} onChange={e => updateSkill(i, "values", e.target.value)} placeholder="Python, TypeScript, JavaScript" style={inputStyle} />
              </div>
              <button onClick={() => removeSkill(i)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 18, paddingBottom: 4 }}>×</button>
            </div>
          ))}
        </div>

        <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ padding: "16px", borderRadius: 2, fontSize: 15 }}>
          {saving ? "Saving..." : saved ? "✓ Profile saved" : "Save profile →"}
        </button>
      </div>
    </div>
    </AuthGuard>
  );
}