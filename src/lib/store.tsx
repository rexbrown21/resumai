"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Resume, Application } from "@/types";
import { supabase } from "@/lib/supabase";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  resumes: Resume[];
  setResumes: (r: Resume[] | ((prev: Resume[]) => Resume[])) => void;
  applications: Application[];
  setApplications: (a: Application[] | ((prev: Application[]) => Application[])) => void;
  addApplication: (a: Application) => void;
  addResume: (r: Omit<Resume, "id">) => Promise<void>;
  removeResume: (id: number) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user from Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserState({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email || "",
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserState({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email || "",
        });
      } else {
        setUserState(null);
        setResumes([]);
        setApplications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch resumes and applications when user logs in
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: resumeData }, { data: appData }] = await Promise.all([
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (resumeData) {
      setResumes(resumeData.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        notes: r.notes || "",
        uploaded: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        tailored: r.tailored_count || 0,
        fileUrl: r.file_url || undefined,
      })));
    }

    if (appData) {
      setApplications(appData.map(a => ({
        id: a.id,
        company: a.company,
        role: a.role,
        status: a.status,
        resumeUsed: a.resume_name || "",
        date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        matchScore: a.match_score || undefined,
        notes: a.notes || "",
      })));
    }

    setLoading(false);
  };

  const setUser = (u: User | null) => {
    setUserState(u);
    if (!u) {
      setResumes([]);
      setApplications([]);
    }
  };

  const addResume = async (r: Omit<Resume, "id">) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        name: r.name,
        type: r.type,
        notes: r.notes,
        tailored_count: 0,
      })
      .select()
      .single();

    if (error) { console.error("Error adding resume:", error); return; }

    if (data) {
      setResumes(prev => [{
        id: data.id,
        name: data.name,
        type: data.type,
        notes: data.notes || "",
        uploaded: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        tailored: 0,
      }, ...prev]);
    }
  };

  const removeResume = async (id: number) => {
    if (!user) return;
    const { error } = await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error("Error removing resume:", error); return; }
    setResumes(prev => prev.filter(r => r.id !== id));
  };

  const addApplication = async (app: Application) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        company: app.company,
        role: app.role,
        status: app.status,
        resume_name: app.resumeUsed,
        match_score: app.matchScore || null,
        notes: app.notes || "",
        date: app.date,
      })
      .select()
      .single();

    if (error) { console.error("Error adding application:", error); return; }

    if (data) {
      setApplications(prev => [{
        id: data.id,
        company: data.company,
        role: data.role,
        status: data.status,
        resumeUsed: data.resume_name || "",
        date: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        matchScore: data.match_score || undefined,
        notes: data.notes || "",
      }, ...prev]);
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, resumes, setResumes,
      applications, setApplications, addApplication,
      addResume, removeResume, loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}