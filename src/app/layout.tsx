import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "ResumAI – Built to fit. Born to land.",
  description: "AI-powered resume tailoring for every job application.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
          <ThemeToggle />
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}