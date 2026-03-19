"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import Nav from "@/components/layout/Nav";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, sessionLoaded } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (sessionLoaded && !user) {
      router.push("/login");
    }
  }, [sessionLoaded, user]);

  if (!sessionLoaded) {
    return (
      <>
        <Nav />
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "2px solid var(--border)",
            borderTopColor: "var(--accent)",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Nav />
      {children}
    </>
  );
}