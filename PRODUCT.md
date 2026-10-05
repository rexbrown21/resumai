# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

African professionals across all career stages — from recent graduates through people with enough history to maintain several distinct resume versions. The product does not target a single seniority band; the resume vault exists precisely because one person carries multiple professional identities (Technical, Managerial, Consulting, Research, General).

Nigeria is the concrete first market rather than the boundary of the audience. Nigerian hiring artifacts are treated as first-class product data, not edge cases: National Youth Service Corps (NYSC) status, state of deployment, and Primary Place of Assignment are captured in the profile and rendered into generated CVs; naira is recognized alongside other currencies when detecting quantified achievements.

The job: a person applying to many roles who knows that sending one generic resume everywhere is losing them interviews, but who cannot realistically rewrite it by hand for each posting. They arrive with an existing resume as a PDF or DOCX, or with raw career notes written in plain language.

## Product Purpose

RezumeAI turns a single career history into the right resume for each specific job, and keeps the resulting applications organized.

A user can: store multiple resume versions in a vault; audit a resume against a fixed diagnostic rubric before sending it anywhere; tailor a stored resume to a pasted job description; generate a complete CV from a structured experience profile when they have no suitable resume; produce a matching cover letter; download any of these as a PDF; and log what was sent where, with status.

Success is an interview callback the user would not otherwise have received. The proximate measures the product can observe are applications tailored and applications tracked through to Interview or Offer status.

## Positioning

The complete loop in one place: **audit → tailor or generate → cover letter → track**, where each stage hands its output to the next rather than ending in a download.

Competing tools typically perform a one-shot rewrite. Here the audit names specific defects in a resume before any rewriting happens and passes the audited text directly into tailoring; the tailored result is saved back to the vault and can seed a cover letter; the application is then logged against the exact resume version used. A neighboring product could copy any single stage, but not the continuity between them — the handoffs are the product.

## Operating Context

- **Input documents:** resumes arrive as PDF or DOCX and are parsed in the browser. Job descriptions arrive as pasted text, validated for length and for signal words before any model call.
- **Output documents:** PDFs generated client-side. Resume and CV PDFs are deliberately plain — black text on white, standard section headers, no tables, columns, graphics or icons — because they are read by automated screening systems before humans see them. The audit report PDF is the exception and follows the product's own visual identity, since no ATS parses it.
- **The screening reality the product is designed around:** applicant tracking systems parse before a recruiter reads. Standard section headings, dates on every role, keyword coverage for the target role type, and machine-readable formatting are treated as functional requirements, not style preferences.
- **Progressive disclosure is the established interaction pattern** for multi-step flows (tailor, audit): one step is active at a time and completed steps collapse into a compact confirmation row with a "Change" affordance.
- **First-run:** a guided tour (driver.js) runs once per user, ever, tracked by a `has_seen_onboarding` flag on `profiles_data`.
- **Theme:** the interface supports both dark and light via a `data-theme` attribute; dark is the default and primary.

## Capabilities and Constraints

**Confirmed capabilities**

- Resume vault: store, preview, and delete multiple named resume versions, each typed (Technical / Managerial / Consulting / Research / General) and counting how often it has been tailored.
- Audit: scores a resume 0–100 across four 25-point categories — Structure & Completeness, ATS Compatibility, Achievement Quality, Role/Company Fit — with per-item flags (good / warning / critical) and a ranked "top 3 fixes". Scores come from a deterministic rubric; the model supplies the specific wording. Results are logged to `audit_logs`.
- Tailor: rewrites a stored resume against a pasted job description, returning a match score, detected job type, injected keywords, a change summary, and a fully structured resume.
- Generate: builds a complete CV from the user's structured experience profile when no suitable resume exists.
- Cover letter: four-paragraph body generated from the profile and job description; the header, date, recipient block, salutation and signature are assembled by the application, never by the model.
- Tracker: applications logged with company, role, status (Saved / Applied / Interview / Offer / Rejected), resume version used, match score, and notes.
- Experience profile: summary, work history in plain language, projects, education, NYSC, certifications, and categorized skills.

**Technical constraints future work must preserve**

- Resume text extraction runs **client-side via CDN-loaded pdfjs 2.16.105 with a same-origin blob worker**, not the npm `pdfjs-dist` package. This is deliberate and load-bearing — it avoids cross-origin worker blocks. DOCX uses mammoth from the same CDN pattern.
- All AI runs through Groq. Groq enforces a tokens-per-minute ceiling that truncates responses mid-JSON; routes carry retry-with-backoff and a JSON repair step, and `max_tokens` is kept deliberately low. Model choice has changed several times and is not a durable product fact.
- Supabase with row-level security throughout; every table is scoped to `auth.uid()`. There is no separate backend — Next.js API routes only.
- Every authenticated page is wrapped in `AuthGuard`.

**Product rules enforced in code, not just intended**

- The system never invents experience. A skill qualifies for inclusion only if the user listed it, or the job description names it *and* it is plausible given their background. This inclusion test is written into the prompts.
- The audit's scoring is deterministic and auditable; the model cannot move a score, only describe it.

**Explicitly undecided**

- **Monetization.** The site currently states "Free to use. No credit card required." Whether that is permanent, a free tier beneath a paid plan, or pre-revenue positioning has not been decided. No pricing surface exists.
- **Geographic scope beyond Nigeria.** The audience is African professionals broadly, but no market other than Nigeria has been specifically built for.

## Brand Commitments

- **Name:** RezumeAI, set as the wordmark `REZUMEAI`. Logo at `public/logo.svg`; app icons at `public/icon-192.png`, `public/icon-512.png`, `public/apple-icon.png`.
- **Committed copy currently live:** "Built to fit. Born to land." (hero), "AI-Powered Resume Intelligence" (eyebrow), "Stop sending the same resume everywhere. Let AI read the job, find the fit, and tailor your story — every single time.", and "Made for Africa" in the footer.
- **Voice:** direct and confident, second person, short declaratives. Monospace for labels, metadata and system feedback; weight and scale carry emphasis rather than exclamation. No corporate hedging, no exclamation marks, no emoji in body copy.
- **The "your voice" commitment:** the product promises AI enhances rather than replaces the user's own account of their work. This is a real product rule enforced in the prompts. The figure "100%" attached to it on the landing page is a marketing framing, not a measurement.

## Evidence on Hand

**Real**

- Sub-30-second tailoring. The "<30s" and "Tailored in 28s" claims reflect observed Groq inference latency and are substantiated.
- The audit rubric in `src/lib/auditRules.ts` is a real, inspectable scoring system — deterministic and reproducible for a given resume.

**Not substantiated — future work must not cite these as data**

- **"3x more interview callbacks vs generic resume submissions"** is aspirational marketing. There is no measurement behind it. Do not build a proof section, case study, or comparison around this number, and do not repeat it as a finding.
- **"100% your voice preserved"** is a framing of a product rule, not a measured rate.

**Absent entirely — do not fabricate**

- No testimonials, named customers, logos, case studies, press coverage, user counts, or usage statistics exist.
- No pricing, licensing, or plan structure exists.
- No third-party ATS certification or partnership exists. Claims about ATS behavior describe how the output is constructed, not an endorsement.

## Product Principles

1. **Never invent the user's experience.** Every generated line must trace back to something the user supplied or something the job description asked for that they plausibly hold. This is the product's credibility and is enforced in code, not left to the model's discretion.
2. **The handoff is the product.** No stage should end in a dead-end download. An audit points at tailoring; a tailored resume returns to the vault and seeds a cover letter; a sent application lands in the tracker. Design each surface for where the user goes next.
3. **Two audiences read every output: a parser, then a person.** Generated documents must survive automated screening before they can impress anyone. Machine-readability is a functional requirement of the artifact, never a style choice to be overridden.
4. **Local specificity is an asset, not a rough edge.** NYSC, naira, and the realities of the Nigerian hiring market are reasons the product fits its users better than a generic tool. Do not sand them off in pursuit of looking international.
5. **Claim only what is true.** The product's subject is a document people stake their livelihood on. Unsubstantiated numbers in our own marketing undercut the honesty we enforce in theirs.
