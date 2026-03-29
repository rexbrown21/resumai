# ResumAI

## Project Overview
AI-powered resume tailoring SaaS. Next.js 16 + TypeScript, Supabase, Groq + Llama 3.3 70B, jsPDF. Deployed on Vercel.

## Local path
C:\Users\Ugo\Documents\resumai

## Tech Stack
- Frontend: Next.js 16, TypeScript, CSS variables
- Auth + DB: Supabase (PostgreSQL, RLS enabled)
- AI: Groq API, Llama 3.3 70B
- PDF: jsPDF
- Analytics: PostHog, Vercel Analytics
- Deploy: Vercel

## Key files
- src/app/page.tsx — landing page
- src/app/dashboard/page.tsx — dashboard
- src/app/tailor/page.tsx — tailor + generate mode
- src/app/profile/page.tsx — experience profile
- src/app/api/tailor/route.ts — AI tailor endpoint
- src/app/api/generate-cv/route.ts — CV generation endpoint
- src/lib/store.tsx — global state + Supabase data fetching
- src/components/AuthGuard.tsx — auth wrapper for protected pages
- src/components/layout/Nav.tsx — navigation

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_POSTHOG_KEY

## Deploy command
npm run build && git add . && git commit -m "message" && git push && npx vercel --prod

## Code style
- Inline styles using COLORS constants from src/lib/constants.ts
- CSS variables for theming (dark/light mode via data-theme attribute)
- All pages wrapped in AuthGuard component
- No separate backend — Next.js API routes only
```

Create that file at the root of your project (`C:\Users\Ugo\Documents\resumai\CLAUDE.md`).

---

## What to Hand Off to Claude Code

These tasks are perfect for Claude Code to handle autonomously with minimal supervision:
```
1. Fix application status persisting to Supabase
   → Edit tracker page + store.tsx

2. Fix dashboard greeting time of day
   → One line change in dashboard

3. Add delete application to tracker
   → Add button + Supabase delete call

4. Fix resume tailored count
   → Update count in Supabase when tailor completes

5. Mobile optimization on profile page
   → Add responsive styles

6. Empty states for new users
   → Add empty state UI to dashboard/tracker/resumes

7. 404 page
   → Create src/app/not-found.tsx

8. Profile empty state on generate
   → Better error + redirect to /profile