import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const JD_SIGNAL_WORDS = [
  "experience", "responsibilities", "requirements", "skills", "role",
  "qualifications", "degree", "years", "team", "company",
];

function validateJobDescription(jobDescription: string): string | null {
  const jd = jobDescription.trim();
  if (jd.length < 100) {
    return "Please paste the full job description — it looks too short to analyze properly.";
  }
  const lowerJd = jd.toLowerCase();
  const matches = JD_SIGNAL_WORDS.filter((word) => lowerJd.includes(word)).length;
  if (matches < 3) {
    return "This doesn't look like a complete job description. Please paste the full posting including responsibilities and requirements.";
  }
  return null;
}

async function createCompletionWithRetry(
  params: Parameters<typeof groq.chat.completions.create>[0]
): Promise<Groq.Chat.ChatCompletion> {
  const maxAttempts = 3;
  const backoffMs = [2000, 4000, 8000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return (await groq.chat.completions.create(
        params
      )) as Groq.Chat.ChatCompletion;
    } catch (error: any) {
      const isRateLimit =
        error.status === 429 ||
        error.message?.includes("rate_limit_exceeded") ||
        error.error?.type === "rate_limit_error";

      if (!isRateLimit || attempt === maxAttempts - 1) {
        throw error;
      }

      const waitMs = backoffMs[attempt];
      console.log(
        `Rate limited on attempt ${attempt + 1}. Waiting ${waitMs}ms before retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("rate_limit_exceeded");
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resumeText, resumeName, resumeId } = await req.json();

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: "Job description and resume are required" },
        { status: 400 }
      );
    }

    const jdError = validateJobDescription(jobDescription);
    if (jdError) {
      return NextResponse.json({ error: jdError }, { status: 400 });
    }

    if (resumeText.trim().length < 200) {
      return NextResponse.json(
        { error: "Please paste your complete resume text — it looks incomplete." },
        { status: 400 }
      );
    }

    const completion = await createCompletionWithRetry({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS-optimized resume writer. Your job is to tailor resumes to match specific job descriptions.

RULES:
1. Analyze the job description and identify key requirements, skills, and keywords
2. Rewrite the resume to highlight relevant experience using keywords from the job description
3. Keep the candidate's authentic voice — only use experiences they actually have
4. Do NOT invent work experience the candidate does not have — for the skills section specifically, follow the SKILLS RULE below
5. SKILLS RULE: The skills section must reflect both the candidate's actual skills from their resume AND skills explicitly required by the job description that are plausibly held given their background. Organize into 3-5 relevant categories. Never invent skills with no basis in the resume or JD.
   - BASE: Always keep the skills already present in the candidate's resume — these are confirmed.
   - SUPPLEMENT: Scan the JD's requirements and responsibilities for technical tools, frameworks, methodologies, and domain keywords, and include those that someone with this candidate's background would plausibly hold, even if not explicitly in their resume.
   - INCLUSION TEST: Only include a skill if EITHER it appears in the candidate's resume OR it appears explicitly in the JD AND is plausible given their background. Never fabricate skills with no basis in either.
   - For TECHNICAL roles (jobType === "Technical"), ensure categories such as Programming Languages, Frameworks & Libraries, Tools & Platforms, and Cloud & Infrastructure or AI/ML & Automation where relevant — inferred from both the JD and the resume.
   - For NON-TECHNICAL roles (Managerial, Consulting, General, Research), ensure categories such as role core competencies (e.g. Project Management, Stakeholder Engagement, Data Analysis), domain-specific tools the JD names (e.g. Excel, Salesforce, Tableau), and soft skills ONLY where the JD requirements explicitly list them — never generic filler like "teamwork" unless the JD names it.
6. Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation

Respond in this exact JSON format:
{
  "jobType": "Technical|Managerial|Consulting|Research|General",
  "matchScore": <number 0-100>,
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggestions": [
    "Specific change 1 that was made",
    "Specific change 2 that was made",
    "Specific change 3 that was made"
  ],
  "structured": {
    "name": "Full Name",
    "contact": "City, Country | phone | email | linkedin | github",
    "summary": "2-3 sentence professional summary tailored to the job",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, Country",
        "period": "Month Year - Month Year",
        "bullets": [
          "Achievement or responsibility bullet 1",
          "Achievement or responsibility bullet 2",
          "Achievement or responsibility bullet 3"
        ]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "period": "Year",
        "bullets": [
          "What you built and the impact",
          "Technologies used"
        ]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "school": "School Name",
        "location": "City, Country",
        "period": "Year - Year",
        "gpa": "4.37/5"
      }
    ],
    "skills": {
      "Languages": "Python, TypeScript, JavaScript",
      "Frameworks": "Next.js, FastAPI, React",
      "Tools": "n8n, Docker, Kubernetes, Git",
      "Cloud": "AWS, GCP, Supabase"
    }
  }
}`,
        },
        {
          role: "user",
          content: `JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME (${resumeName}):
${resumeText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0].message.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (resumeId) {
      const { data: resume } = await supabaseAdmin
        .from("resumes")
        .select("tailored_count")
        .eq("id", resumeId)
        .single();
      await supabaseAdmin
        .from("resumes")
        .update({ tailored_count: (resume?.tailored_count ?? 0) + 1 })
        .eq("id", resumeId);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes("rate_limit_exceeded") ||
        (error as any).status === 429);

    console.error("Tailor error:", error);
    return NextResponse.json(
      {
        error: isRateLimit
          ? "We're experiencing high demand right now. Please try again in a moment."
          : "Failed to tailor resume",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}