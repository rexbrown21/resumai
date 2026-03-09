import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resumeText, resumeName } = await req.json();

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: "Job description and resume are required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an expert resume writer and career coach. Your job is to tailor a resume to match a specific job description.

INSTRUCTIONS:
1. Analyze the job description and identify key requirements, skills, and keywords
2. Rewrite the resume bullets to highlight relevant experience using keywords from the job description
3. Keep the candidate's authentic voice and only use experiences they actually have
4. Reorder sections to prioritize the most relevant experience
5. Do NOT invent experience or skills the candidate doesn't have

Respond ONLY with a valid JSON object in this exact format, no markdown, no backticks:
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
}

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME (${resumeName}):
${resumeText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean response and parse JSON
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