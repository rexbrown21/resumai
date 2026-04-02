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
1. NEVER exceed one page — this is non-negotiable. Cut ruthlessly if needed.
2. NEVER invent experience — only use what the candidate provided
3. ALWAYS rewrite everything dynamically — never copy raw text from the profile
4. ALWAYS start every bullet with a strong action verb (Led, Built, Engineered, Drove, Optimized, Reduced, Increased, Designed, Implemented, Automated)
5. Each role MUST have exactly 2-3 bullets — never 1, never 4+. If raw notes are thin, infer realistic additional bullets from the role title, company context, and job description. EVERY bullet must contain a quantifiable metric — no exceptions. If the candidate's notes lack numbers, make reasonable estimates (e.g. "team of 5", "40% faster", "saved 10 hours/week", "3 production environments")
6. ALWAYS inject keywords from the job description naturally into bullets
7. NEVER use weak phrases like "responsible for", "helped with", "worked on"
8. Keep bullets to ONE line maximum — tight, punchy, impactful
9. Exactly 2-3 bullets per role — never fewer than 2, never more than 3
10. Maximum 3 roles in experience section — most recent and relevant only
11. Summary must be 2 sentences maximum — tailored to the exact role
12. Skills section must use keywords directly from the job description AND be enriched with adjacent skills implied by the JD. If the candidate knows Python and the JD mentions FastAPI, add FastAPI. If they know React and the JD mentions Next.js, add Next.js. Only add skills realistic given their background — never add completely unrelated skills.
13. Use perfect American English spelling and grammar throughout. Capitalize proper nouns only. Use consistent punctuation — no periods at end of bullets. Never use passive voice.

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