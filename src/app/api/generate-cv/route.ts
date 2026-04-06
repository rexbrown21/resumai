import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, userId } = await req.json();

    if (!jobDescription || !userId) {
      return NextResponse.json(
        { error: "Job description and user ID required" },
        { status: 400 }
      );
    }

    // Fetch user profile
    const { data, error } = await supabase
      .from("profiles_data")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (error || !data?.profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    const profile = data.profile;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a world-class ATS resume writer and career strategist. Your job is to transform a candidate's raw experience into a powerful, one-page ATS-optimized resume that gets past automated screening systems and impresses human recruiters.

CORE RULES:
1. NEVER invent experience — only use what the candidate provided
2. ALWAYS rewrite everything dynamically — never copy raw text from the profile
3. ALWAYS start every bullet with a strong action verb (Led, Built, Engineered, Drove, Optimized, Reduced, Increased, Designed, Implemented, Automated)
4. Include ALL work experience roles from the candidate's profile — do not cut or drop any role
5. Each role MUST have exactly 3 bullet points — never 2, never 4. If raw notes are thin, infer realistic additional bullets from the role title, company context, and job description. EVERY bullet must contain a quantifiable metric — no exceptions. If the candidate's notes lack numbers, make reasonable estimates (e.g. "team of 5", "40% faster", "saved 10 hours/week", "3 production environments")
6. Include ALL projects from the candidate's profile, each with exactly 2 bullet points
7. ALWAYS inject keywords from the job description naturally into bullets
8. NEVER use weak phrases like "responsible for", "helped with", "worked on"
9. Keep bullets to ONE line maximum — tight, punchy, impactful
10. Summary must be 2 sentences maximum — tailored to the exact role
11. Skills section must have at least 6 categories with 3-5 items each. Use keywords directly from the job description AND enrich with adjacent skills implied by the JD. If the candidate knows Python and the JD mentions FastAPI, add FastAPI. Only add skills realistic given their background — never add completely unrelated skills.
12. Use perfect American English spelling and grammar throughout. Capitalize proper nouns only. Use consistent punctuation — no periods at end of bullets. Never use passive voice.
13. The goal is a FULL, DENSE, content-rich resume — include everything. The PDF formatter will handle the one-page layout constraint.

REPETITION RULES:
- NEVER start two bullets with the same action verb across the entire resume. Track every verb used and pick a different one each time.
- Banned pattern: "Built X, Built Y, Built Z" — correct: "Built X, Engineered Y, Developed Z"
- Rotate through this verb bank:
  Technical: Built, Engineered, Developed, Architected, Designed, Implemented, Deployed, Automated, Optimized, Integrated, Configured, Migrated, Refactored, Streamlined
  Leadership: Led, Managed, Directed, Coordinated, Mentored, Spearheaded, Championed, Oversaw, Facilitated
  Results: Reduced, Increased, Improved, Accelerated, Achieved, Delivered, Generated, Drove, Boosted, Cut, Saved
  Analysis: Analyzed, Evaluated, Identified, Assessed, Monitored, Tracked, Measured, Reported
- NEVER repeat the same noun phrase more than once. Use synonyms: "team" → "cross-functional team" / "engineering team" / "squad"; "system" → "platform" / "infrastructure" / "pipeline" / "framework"; "process" → "workflow" / "pipeline" / "procedure" / "operation"
- Vary sentence structure — not every bullet should follow the exact same pattern

SPELLING AND GRAMMAR RULES:
- Use perfect American English consistently throughout
- Capitalize only: proper nouns, company names, product names, acronyms, and the first word of the candidate's name. Do NOT capitalize common job titles mid-sentence.
- No periods at the end of bullet points — ever
- No comma splices — each bullet is one clean thought
- Numbers: spell out one through nine, use digits for 10 and above — EXCEPT for percentages and metrics, always use digits (e.g. 3x, 40%, $200k)
- Tense: current role uses present tense, all past roles use past tense — no mixing within a role
- No passive voice anywhere — every sentence must have a clear active subject
- No filler words: "various", "multiple", "several", "different", "numerous" — replace with specific numbers instead
- Before finalizing JSON output, mentally re-read every bullet and fix any spelling, grammar, or consistency issues

ATS FORMATTING RULES:
- Use standard section headers: Professional Summary, Work Experience, Projects, Education, Skills
- No tables, no columns, no graphics, no special characters except hyphens and pipes
- Consistent date format: Mon YYYY - Mon YYYY
- No photos, no colors, no icons

TRANSFORMATION RULES:
- Raw input: "I resolved customer tickets and helped with automation"
- Output: "Resolved 100+ customer support tickets achieving 95% satisfaction rate while automating repetitive workflows using n8n"

- Raw input: "built a bot for dry cleaning"
- Output: "Engineered AI-powered customer service bot using GPT-4o and n8n, reducing response time from hours to seconds"

- Raw input: "worked on CI/CD pipeline"
- Output: "Built and deployed Kubernetes CI/CD pipeline cutting deployment time by 80% across 3 production environments"

The final resume must read like it was written by a senior recruiter at McKinsey — precise, impactful, keyword-rich, and impossible to ignore.

Respond ONLY with valid JSON — no markdown, no backticks, no explanation outside the JSON.

Respond in this exact JSON format:
{
  "jobType": "Technical|Managerial|Consulting|Research|General",
  "matchScore": <number 0-100>,
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggestions": [
    "Specific transformation made and why it strengthens the resume",
    "Specific keyword injected and where",
    "Specific cut made to keep it one page"
  ],
  "structured": {
    "name": "Full Name",
    "contact": "City, Country | phone | email | linkedin | github",
    "summary": "One powerful sentence about who they are. One sentence about what they bring to this specific role.",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, Country",
        "period": "Mon YYYY - Mon YYYY",
        "bullets": [
          "Action verb + what you did + quantified impact",
          "Action verb + what you did + quantified impact",
          "Action verb + what you did + quantified impact"
        ]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "period": "YYYY",
        "bullets": [
          "Action verb + what you built + tech stack + impact"
        ]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "school": "School Name",
        "location": "City, Country",
        "period": "YYYY - YYYY",
        "gpa": "X.XX/5"
      }
    ],
    "skills": {
      "Category": "skill1, skill2, skill3"
    }
  }
}`,
        },
        {
          role: "user",
          content: `JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE:
Name: ${profile.name}
Location: ${profile.location}
Email: ${profile.email}
Phone: ${profile.phone}
LinkedIn: ${profile.linkedin}
GitHub: ${profile.github}
Summary: ${profile.summary}

WORK EXPERIENCE:
${profile.experience?.map((exp: any) => `
${exp.title} at ${exp.company} (${exp.location}) — ${exp.period}
${exp.bullets?.join(" ")}
`).join("\n")}

PROJECTS:
${profile.projects?.map((proj: any) => `
${proj.name} (${proj.period})
${proj.bullets?.join(" ")}
`).join("\n")}

EDUCATION:
${profile.education?.map((edu: any) => `
${edu.degree} — ${edu.school}, ${edu.location} (${edu.period}) GPA: ${edu.gpa}
`).join("\n")}

SKILLS:
${profile.skills?.map((s: any) => `${s.category}: ${s.values}`).join("\n")}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0].message.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate CV error:", error);
    return NextResponse.json(
      { error: "Failed to generate CV" },
      { status: 500 }
    );
  }
}