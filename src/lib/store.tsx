"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { User, Resume, Application } from "@/types";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  resumes: Resume[];
  setResumes: (r: Resume[] | ((prev: Resume[]) => Resume[])) => void;
  applications: Application[];
  setApplications: (a: Application[] | ((prev: Application[]) => Application[])) => void;
  addApplication: (a: Application) => void;
}

const AppContext = createContext<AppState | null>(null);

const SEED_RESUMES: Resume[] = [
  { id: 1, name: "Software Engineer - Full Stack", type: "Technical", uploaded: "Mar 1, 2025", tailored: 4, notes: "" },
  { id: 2, name: "AI/ML Engineer", type: "Technical", uploaded: "Mar 3, 2025", tailored: 2, notes: "" },
  { id: 3, name: "Product Manager", type: "Managerial", uploaded: "Mar 5, 2025", tailored: 1, notes: "" },
];

const SEED_APPS: Application[] = [
  { id: 1, company: "Stripe", role: "Software Engineer II", status: "Interview", resumeUsed: "Software Engineer - Full Stack", date: "Mar 1", matchScore: 91, notes: "" },
  { id: 2, company: "Notion", role: "Full Stack Engineer", status: "Applied", resumeUsed: "Software Engineer - Full Stack", date: "Mar 3", matchScore: 84, notes: "" },
  { id: 3, company: "Anthropic", role: "ML Researcher", status: "Applied", resumeUsed: "AI/ML Engineer", date: "Mar 5", matchScore: 88, notes: "" },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<Resume[]>(SEED_RESUMES);
  const [applications, setApplications] = useState<Application[]>(SEED_APPS);

  const addApplication = (app: Application) =>
    setApplications((prev) => [app, ...prev]);

  return (
    <AppContext.Provider value={{ user, setUser, resumes, setResumes, applications, setApplications, addApplication }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
