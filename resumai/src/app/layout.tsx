import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ResumAI — Built to fit. Born to land.",
  description: "AI-powered resume tailoring for every job application.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Nav />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
