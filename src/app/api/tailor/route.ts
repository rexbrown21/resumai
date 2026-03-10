import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resumeText, resumeName } = await req.json();

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: "Job description and resume are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("API Key exists:", !!apiKey);
    console.log("API Key length:", apiKey?.length);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://resumai-eta.vercel.app",
        "X-Title": "ResumAI",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          {
            role: "system",
            content: `You are an expert resume writer and career coach. Your job is to tailor resumes to match specific job descriptions.

RULES:
1. Analyze the job description and identify key requirements, skills, and keywords
2. Rewrite the resume bullets to highlight relevant experience using keywords from the job description
3. Keep the candidate's authentic voice — only use experiences they actually have
4. Reorder sections to prioritize the most relevant experience
5. Do NOT invent experience or skills the candidate does not have
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
  "tailoredResume": "The full rewritten resume text here"
}`
          },
          {
            role: "user",
            content: `JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME (${resumeName}):
${resumeText}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Tailor error:", error);
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 });
  }
}