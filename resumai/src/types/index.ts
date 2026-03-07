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
}
