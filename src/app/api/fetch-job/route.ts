import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  let url = "";
  try {
    const body = await req.json();
    url = body.url;
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error("Response status:", response.status, response.statusText);
      return NextResponse.json({ error: `Could not fetch this page (${response.status}). Paste the job description manually.` }, { status: 400 });
    }

    const html = await response.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a job description extractor. Given raw text from a job posting webpage, extract ONLY the job description content including: job title, company name, responsibilities, requirements, and any other relevant job details. Remove all navigation, ads, footers, and unrelated content. Return clean plain text only — no markdown, no JSON, just the extracted job description text.`,
        },
        {
          role: "user",
          content: `Extract the job description from this webpage text:\n\n${text}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const jobDescription = completion.choices[0].message.content || "";

    if (jobDescription.length < 100) {
      return NextResponse.json({ error: "Couldn't extract job details from this page. Paste the job description manually." }, { status: 400 });
    }

    return NextResponse.json({ jobDescription });
  } catch (error) {
    console.error("Fetch job error:", error);
    console.error("URL attempted:", url);
    return NextResponse.json({ error: "Could not fetch this page. Paste the job description manually." }, { status: 500 });
  }
}