"use client";

import { useState, useEffect } from "react";

const KEYWORDS = [
  "Python", "Leadership", "Product Manager", "AWS", "React", "TypeScript",
  "DevOps", "Machine Learning", "Kubernetes", "SQL", "Agile", "Scrum",
  "CI/CD", "Docker", "Node.js", "Data Analysis", "Strategic Planning",
  "Stakeholder Management", "API Design", "Prompt Engineering", "n8n",
  "Automation", "FastAPI", "Communication", "Problem Solving", "Git",
  "Figma", "UX Research", "Cloud Architecture", "Team Lead",
];

export default function FloatingKeywords() {
  const [keywords, setKeywords] = useState<{
    id: number; word: string; x: number;
    duration: number; delay: number; size: number;
  }[]>([]);

  useEffect(() => {
    setKeywords(KEYWORDS.map((word, i) => ({
      id: i,
      word,
      x: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 15,
      size: 10 + Math.random() * 4,
    })));
  }, []);

  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0, overflow: "hidden",
      }}>
        {keywords.map(({ id, word, x, duration, delay, size }) => (
          <div key={id} style={{
            position: "absolute",
            left: `${x}%`,
            bottom: "-40px",
            fontFamily: "'DM Mono', monospace",
            fontSize: `${size}px`,
            color: "var(--keyword-color)",
            opacity: 0.15,
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
          5%   { opacity: 0.15; }
          95%  { opacity: 0.15; }
          100% { transform: translateY(-105vh) rotate(8deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}