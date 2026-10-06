"use client";

import { useState, useEffect } from "react";

const KEYWORDS = [
  // Tech & Engineering
  "Python", "TypeScript", "React", "Node.js",
  "AWS", "Docker", "Kubernetes", "REST APIs",
  "Machine Learning", "LLMs", "n8n", "DevOps",
  "CI/CD", "Microservices", "PostgreSQL", "Git",

  // Product & Design
  "Product Roadmap", "User Research", "Figma",
  "A/B Testing", "KPIs", "Agile", "Scrum",
  "Wireframes", "Design System", "Prototyping",
  "User Stories", "OKRs", "Sprint Planning",

  // Finance & Data
  "Financial Modeling", "SQL", "Power BI",
  "Tableau", "Excel", "Forecasting", "Budgeting",
  "Risk Analysis", "Data Analysis", "Reporting",
  "Audit", "Compliance", "Reconciliation",

  // Marketing & Growth
  "SEO", "Content Strategy", "Google Analytics",
  "Campaign Management", "Brand Strategy",
  "Social Media", "Copywriting", "Email Marketing",
  "Growth Hacking", "Conversion Rate", "CRM",

  // Operations & Management
  "Project Management", "Stakeholder Management",
  "Process Improvement", "PMP", "Vendor Management",
  "Supply Chain", "Logistics", "Team Leadership",
  "Strategic Planning", "Change Management",

  // People & HR
  "Talent Acquisition", "Onboarding", "HRIS",
  "Performance Management", "Employee Relations",
  "Payroll", "Recruitment", "L&D", "Culture",

  // Healthcare & Science
  "Clinical Research", "GCP", "Pharmacovigilance",
  "Public Health", "Laboratory", "Data Collection",
  "Research Methodology", "IRB", "Grant Writing",

  // Legal & Compliance
  "Contract Review", "Due Diligence", "GDPR",
  "Regulatory Affairs", "Legal Research",
  "Risk Management", "Policy Writing",

  // Education & NGO
  "Curriculum Design", "Program Evaluation",
  "Community Engagement", "Grant Management",
  "M&E", "Capacity Building", "Advocacy",
  "Stakeholder Engagement", "Impact Reporting",

  // Universal
  "Communication", "Leadership", "Collaboration",
  "Problem Solving", "Critical Thinking",
  "Presentation", "Negotiation", "Mentorship",
  "NYSC", "Abuja", "Lagos", "Remote", "Hybrid",
];

const LIGHT_NEON_COLORS = [
  "#ff3cac", "#7b2ff7", "#00d4ff", "#00ff88",
  "#ff6b00", "#e8ff47", "#ff0099", "#00ffcc",
  "#6bdb3a", "#ff4757", "#1e90ff", "#ff9f43",
];

export default function FloatingKeywords() {
  const [keywords, setKeywords] = useState<{
    id: number; word: string; x: number;
    duration: number; delay: number; size: number; colorIndex: number;
  }[]>([]);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setKeywords(KEYWORDS.map((word, i) => ({
      id: i,
      word,
      x: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 15,
      size: 10 + Math.random() * 4,
      colorIndex: i,
    })));

    setIsLight(document.documentElement.getAttribute("data-theme") === "light");

    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Purely decorative — hidden from screen readers so the drifting skill
          words aren't announced as page content. */}
      <div aria-hidden="true" style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0, overflow: "hidden",
      }}>
        {keywords.map(({ id, word, x, duration, delay, size, colorIndex }) => (
          <div key={id} style={{
            position: "absolute",
            left: `${x}%`,
            bottom: "-40px",
            fontFamily: "'DM Mono', monospace",
            fontSize: `${size}px`,
            color: isLight
              ? LIGHT_NEON_COLORS[colorIndex % LIGHT_NEON_COLORS.length]
              : "#ffffff",
            opacity: isLight ? 0.55 : 0.15,
            fontWeight: isLight ? 600 : 400,
            animation: `floatUp ${duration}s ${delay}s linear infinite`,
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}>
            {word}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          5%   { opacity: ${isLight ? 0.55 : 0.15}; }
          95%  { opacity: ${isLight ? 0.55 : 0.15}; }
          100% { transform: translateY(-105vh) rotate(8deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}