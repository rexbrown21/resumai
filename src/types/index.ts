export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Resume {
  id: number;
  name: string;
  type: "Technical" | "Managerial" | "Consulting" | "Research" | "General";
  notes: string;
  uploaded: string;
  tailored: number;
  fileUrl?: string;
  structured_data?: {
    name: string;
    contact: string;
    summary: string;
    experience: { title: string; company: string; location: string; period: string; bullets: string[] }[];
    projects: { name: string; period: string; bullets: string[] }[];
    education: { degree: string; school: string; location: string; period: string; gpa: string }[];
    skills: Record<string, string>;
  } | null;
}

export interface Application {
  id: number;
  company: string;
  role: string;
  status: "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";
  resumeUsed: string;
  date: string;
  matchScore?: number;
  notes: string;
}

export interface TailorResult {
  jobType: string;
  matchScore: number;
  keywords: string[];
  suggestions: string[];
  tailoredResume?: string;
  structured?: {
    name: string;
    contact: string;
    summary: string;
    experience: {
      title: string;
      company: string;
      location: string;
      period: string;
      bullets: string[];
    }[];
    projects: {
      name: string;
      period: string;
      bullets: string[];
    }[];
    education: {
      degree: string;
      school: string;
      location: string;
      period: string;
      gpa: string;
    }[];
    skills: Record<string, string>;
  };
}