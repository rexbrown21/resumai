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

    // Header block for the final letter — prefer discrete profile fields,
    // fall back to the structured CV's combined contact line.
    const name = candidateName;
    let contactLine = "";
    let locationLine = "";
    if (profile) {
      contactLine = [profile.phone, profile.email, profile.linkedin]
        .filter(Boolean)
        .join(" | ");
      locationLine = profile.location || "";
    }
    if (!contactLine) contactLine = candidateContact;

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a world-class career coach and writer. You write the BODY of a cover letter that sounds like a confident senior professional — not a template.

The application assembles the final letter into this exact business-letter structure (you do NOT write the header, date, recipient block, salutation, or signature — only the four body paragraphs):

[Candidate Name]
[Phone] | [Email] | [LinkedIn/Portfolio URL]
[City, Country]

[Today's Date]

[Hiring Manager Name if known, otherwise "Hiring Team"]
[Company Name]

Dear [Hiring Manager Name / Hiring Team],

PARAGRAPH 1 — Hook + role interest:
Open with why you're writing using something specific — a result delivered, a connection to the company's work, or a direct tie to the role. NEVER use "I am writing to apply for" or similar stiff openers.

PARAGRAPH 2 — Proof you can do the job:
Pick 1-2 concrete achievements relevant to the role from the candidate profile. Use numbers wherever possible. Connect what they did to what the company needs — don't just restate the resume.

PARAGRAPH 3 — Why this company specifically:
Reference something real and specific about the company (product, mission, recent move) and tie it to why the candidate wants this role.

PARAGRAPH 4 — Close strong:
Reiterate interest, invite next steps, thank them. Confident, not desperate.

Sincerely,
[Candidate Name]

RULES:
- Write EXACTLY four paragraphs, in the order and with the purpose described above
- Each paragraph max 3-4 sentences
- Total length across all four paragraphs: 250-320 words
- Never use cliches: "I hope this finds you well", "I am writing to express my interest", "I would be a great fit", "I look forward to hearing from you"
- Confident, specific, professional tone throughout
- Perfect American English, active voice only, no passive constructions
- Do NOT include the header, date, recipient block, salutation ("Dear ..."), closing ("Sincerely,"), or the candidate's name — the application adds those

Respond ONLY with valid JSON — no markdown, no backticks. Return the four body paragraphs as an array of four strings:
{ "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4"], "wordCount": <number> }`,
        },
        {
          role: "user",
          content: `ROLE: ${role || "the open position"} at ${company || "the company"}
TODAY'S DATE: ${today}

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

    // Normalize the model output into exactly the body paragraphs
    let paragraphs: string[] = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((p: any) => String(p).trim()).filter(Boolean)
      : typeof parsed.coverLetter === "string"
        ? parsed.coverLetter.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean)
        : [];

    // Build the recipient + signature blocks from data we control (never the model)
    const recipient = "Hiring Team";
    const salutation = `Dear ${recipient},`;
    const headerLines = [name, contactLine, locationLine].filter(Boolean);

    const recipientBlock = [recipient, company].filter(Boolean).join("\n");
    const bodyText = paragraphs.join("\n\n");

    const coverLetter = [
      headerLines.join("\n"),
      today,
      recipientBlock,
      salutation,
      bodyText,
      `Sincerely,\n${name}`,
    ].join("\n\n");

    const wordCount =
      typeof parsed.wordCount === "number"
        ? parsed.wordCount
        : bodyText.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      coverLetter,
      name,
      contact: contactLine,
      location: locationLine,
      date: today,
      recipient,
      company: company || "",
      salutation,
      paragraphs,
      signature: name,
      wordCount,
    });
  } catch (error) {
    console.error("Cover letter error:", error);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}