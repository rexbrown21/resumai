import type { NextConfig } from "next";

// Content-Security-Policy. Built per-directive for readability.
// NOTE: several entries beyond a "minimal" policy are REQUIRED by existing
// integrations discovered in the codebase — removing them breaks the app:
//   - https://fonts.googleapis.com / https://fonts.gstatic.com → Google Fonts
//     are pulled via an @import in globals.css (style + font files).
//   - https://cdn.jsdelivr.net → pdfjs + mammoth are loaded from CDN for
//     client-side PDF/DOCX resume parsing (script-src), and the pdfjs worker
//     script is fetched (connect-src) then run from a blob: URL (worker-src).
//   - https://app.posthog.com → the actual PostHog api_host configured in
//     PostHogProvider.tsx (in addition to the us(.assets).i.posthog.com hosts).
//   - 'unsafe-inline' (style/script) and 'unsafe-eval' (script) are required by
//     Next.js + the app's pervasive inline styles + PostHog.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com https://us.i.posthog.com https://app.posthog.com https://vercel.live https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://api.groq.com https://us.i.posthog.com https://us-assets.i.posthog.com https://app.posthog.com https://vercel.live https://cdn.jsdelivr.net wss://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
