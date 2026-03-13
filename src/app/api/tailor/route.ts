import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resumeText, resumeName } = await req.json();

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: "Job description and resume are required" },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ATS-optimized resume writer. Your job is to tailor resumes to match specific job descriptions.

RULES:
1. Analyze the job description and identify key requirements, skills, and keywords
2. Rewrite the resume to highlight relevant experience using keywords from the job description
3. Keep the candidate's authentic voice — only use experiences they actually have
4. Do NOT invent experience or skills the candidate does not have
5. Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation

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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Tailor error:", error);
    return NextResponse.json(
      { error: "Failed to tailor resume" },
      { status: 500 }
    );
  }
}