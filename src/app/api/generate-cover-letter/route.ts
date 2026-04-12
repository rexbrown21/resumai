import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, userId, company, role, structured } = await req.json();

    if (!jobDescription) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    let profile = null;
    if (userId) {
      const { data } = await supabaseAdmin
        .from("profiles_data")
        .select("profile")
        .eq("user_id", userId)
        .single();
      profile = data?.profile || null;
    }

    // Build candidate context from structured CV data or profile
    const candidateName = structured?.name || profile?.name || "the candidate";
    const candidateContact = structured?.contact || profile?.email || "";
    const experienceSummary = structured?.experience
      ? structured.experience.map((e: any) =>
          `${e.title} at ${e.company}: ${e.bullets?.join(" ")}`
        ).join("\n")
      : profile?.experience
        ?.map((e: any) => `${e.title} at ${e.company}: ${e.bullets?.join(" ")}`)
        .join("\n") || "";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a world-class career coach and writer. Your job is to write a compelling, authentic cover letter that sounds like a confident senior professional — not a template.

COVER LETTER RULES:
1. Maximum 3 paragraphs — never more
2. Never exceed one page (250-320 words maximum)
3. NEVER use these cliche openers:
   - "I am writing to express my interest"
   - "I am excited to apply"
   - "Please find attached my resume"
   - "I believe I would be a great fit"
   - "I hope this letter finds you well"
4. Open with a bold confident hook that mentions the specific role and company and immediately establishes credibility. Example: "Paystack's API infrastructure powers millions of transactions across Africa — and I've spent the last 3 years building exactly the kind of systems that make that possible."
5. Paragraph 2: highlight 2-3 specific achievements with numbers from the candidate's experience. Connect each achievement directly to what the job requires. Be specific, not generic.
6. Paragraph 3: confident close. Express genuine interest in the company's mission specifically. End with a clear, confident call to action — never say "I look forward to hearing from you". Use something like "I'd welcome the chance to discuss how I can contribute to [specific thing about the company]."
7. Tone: confident senior professional. Not desperate, not overly formal, not robotic. Like a great engineer writing to a peer they respect.
8. No filler sentences. Every sentence must earn its place.
9. Address to "Hiring Manager" — no generic "Dear Sir/Madam"
10. Perfect American English, active voice only, no passive constructions
11. Sign off with just the candidate's first name

Respond ONLY with valid JSON — no markdown, no backticks:
{ "coverLetter": "full cover letter text here", "wordCount": <number> }`,
        },
        {
          role: "user",
          content: `ROLE: ${role || "the open position"} at ${company || "the company"}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE NAME: ${candidateName}
CANDIDATE CONTACT: ${candidateContact}

CANDIDATE EXPERIENCE:
${experienceSummary}`,
        },
      ],
      temperature: 0.75,
      max_tokens: 1024,
    });

    const text = completion.choices[0].message.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Cover letter error:", error);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}