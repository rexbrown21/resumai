import type { Metadata } from "next";
import "driver.js/dist/driver.css";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import { Analytics } from "@vercel/analytics/react";
import PostHogProvider from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: "RezumeAI – Built to fit. Born to land.",
  description: "AI-powered resume tailoring for every job application.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          <AppProvider>
            {children}
            <ThemeToggle />
            <Analytics />
          </AppProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}