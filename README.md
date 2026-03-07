# ResumAI

AI-powered resume tailoring for every job application.

## Stack
- **Frontend**: Next.js 15 + TypeScript
- **Styling**: Inline styles + global CSS (no Tailwind dependency)
- **State**: React Context (src/lib/store.tsx)
- **Auth/DB**: Supabase (to be wired up)
- **AI**: OpenRouter → GPT-4o mini (to be wired up)
- **Automation**: n8n webhook (to be wired up)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing page
│   ├── layout.tsx        # Root layout + providers
│   ├── globals.css       # Global styles + design tokens
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── resumes/page.tsx
│   ├── tailor/page.tsx
│   └── tracker/page.tsx
├── components/
│   └── Nav.tsx
├── lib/
│   ├── store.tsx         # Global state (Context)
│   └── constants.ts      # Colors, types, status maps
└── types/
    └── index.ts
```

## Next Steps
1. Wire Supabase auth in `/login` and `/signup`
2. Add Supabase Storage for resume file uploads
3. Build FastAPI backend for `/api/tailor`
4. Connect n8n webhook for application logging
