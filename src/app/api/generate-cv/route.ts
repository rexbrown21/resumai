import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, userId } = await req.json();

    if (!jobDescription || !userId) {
      return NextResponse.json({ error: "Job description and user ID required" }, { status: 400 });
    }

    // Fetch user profile from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("profiles_data")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (error || !data?.profile) {
      return NextResponse.json({ error: "Profile not found. Please complete your profile first." }, { status: 404 });
    }

    const profile = data.profile;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS resume writer. Given a candidate's experience profile and a job description, generate a complete, polished, ATS-optimized resume tailored specifically for that job.

RULES:
1. Use ONLY information from the candidate's profile — never invent experience
2. Rewrite the candidate's raw descriptions into strong, quantified resume bullets
3. Prioritize and reorder experience to match the job description
4. Use keywords from the job description naturally throughout
5. Keep the candidate's authentic voice
6. Respond ONLY with valid JSON — no markdown, no backticks, no explanation

Respond in this exact JSON format:
{
  "jobType": "Technical|Managerial|Consulting|Research|General",
  "matchScore": <number 0-100>,
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggestions": [
    "What was changed or emphasized for this role",
    "What was reordered or highlighted",
    "What keywords were added"
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
          "Strong action-verb bullet with quantified impact",
          "Strong action-verb bullet with quantified impact"
        ]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "period": "Year",
        "bullets": [
          "What was built and the impact",
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
    return NextResponse.json({ error: "Failed to generate CV" }, { status: 500 });
  }
}