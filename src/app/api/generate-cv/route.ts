import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { parseModelJson, usableResumePayload } from "@/lib/parseModelJson";

// Serverless functions are killed at the platform's duration limit, and a kill
// returns an empty/HTML body rather than JSON — which is what surfaced in the
// UI as "Unexpected end of JSON input". Raising this is the real fix; the
// deadline guard below keeps our own retries inside the budget.
export const maxDuration = 60;

// Single source of truth — the health check reads this same constant, so the
// two can never drift. Overridable from the environment because this project
// has now changed models five times: a wrong id can be corrected from the
// Vercel dashboard without shipping code.
const MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";

// Reasoning-capable models spend part of this budget thinking before emitting
// any content. At 2000 the entire budget could go to reasoning, leaving content
// empty with finish_reason "length" — the empty-response failure being fixed.
const MAX_COMPLETION_TOKENS = 4000;

// Input caps. Tunable — raise them if generated CVs start losing real detail.
const MAX_EXPERIENCE_CHARS = 200;
const MAX_PROJECT_CHARS = 150;
const MAX_JD_CHARS = 1000;

// Headroom under maxDuration so we always return JSON ourselves rather than
// letting the platform kill us mid-request.
const TIME_BUDGET_MS = 50_000;

// Full prompt logging contains the user's name, email and phone. Off unless
// deliberately enabled for a debugging session.
const DEBUG_PROMPT = process.env.DEBUG_CV_PROMPT === "1";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function clip(value: unknown, max: number): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function createCompletionWithRetry(
  params: Parameters<typeof groq.chat.completions.create>[0],
  deadlineAt: number
): Promise<Groq.Chat.ChatCompletion> {
  const maxAttempts = 3;
  const backoffMs = [1500, 3000];

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

      console.error(`[generate-cv] groq attempt ${attempt + 1} failed`, {
        status: error?.status,
        type: error?.error?.type,
        message: error?.message,
        isRateLimit,
        stack: error?.stack,
      });

      if (!isRateLimit || attempt === maxAttempts - 1) throw error;

      // Don't start a wait-plus-inference cycle we cannot finish — being killed
      // by the platform loses the JSON error body the client needs.
      const waitMs = backoffMs[attempt] ?? 3000;
      if (Date.now() + waitMs + 10_000 > deadlineAt) {
        console.error("[generate-cv] abandoning retries: not enough time budget left");
        throw error;
      }

      console.log(`[generate-cv] rate limited, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("rate_limit_exceeded");
}

/** Reachability + configuration check. Booleans only, never values. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    model: MODEL,
    env: {
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    maxDuration,
  });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const deadlineAt = startedAt + TIME_BUDGET_MS;

  try {
    const { jobDescription, userId, company, role } = await req.json();

    if (!jobDescription || !userId) {
      return NextResponse.json(
        { error: "Job description and user ID required" },
        { status: 400 }
      );
    }

    const jdError = validateJobDescription(jobDescription);
    if (jdError) {
      return NextResponse.json({ error: jdError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles_data")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (error || !data?.profile) {
      console.error("[generate-cv] profile lookup failed", {
        userId,
        supabaseError: error?.message,
      });
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    const profile = data.profile;

    // Shape and size only — the profile itself is personal data.
    console.log("[generate-cv] profile shape", {
      experience: profile.experience?.length ?? 0,
      projects: profile.projects?.length ?? 0,
      education: profile.education?.length ?? 0,
      skills: profile.skills?.length ?? 0,
      certifications: profile.certifications?.length ?? 0,
      hasNysc: !!profile.nationalService?.status,
      profileChars: JSON.stringify(profile).length,
      jdChars: jobDescription.length,
      jdTruncated: jobDescription.length > MAX_JD_CHARS,
    });

    const systemPrompt = `You are an expert ATS resume writer. Build a dense, one-page, ATS-optimized CV from the candidate's profile, tailored to the target job.

RULES
1. Never invent experience. Use only the profile, and rewrite it rather than copying it.
2. Include every work role (exactly 3 bullets each) and every project (exactly 2 bullets each). Drop nothing.
3. Every bullet needs a hard number: percentage, multiplier, count, time saved, scale, money, or team size. If the notes have none, estimate realistically from the role and company.
4. One line per bullet. The summary is 2 sentences and names the target role, and the company when one is given.
5. Start each bullet with an action verb, and use each verb only once in the whole CV.
6. Never use these verbs: Developed, Designed, Built, Implemented, Managed, Created, Utilized, Leveraged, Assisted, Supported, Helped, Worked, Responsible, Contributed.
7. Never reuse an outcome phrase, a metric phrasing, or a named tool twice.
8. Work the job description's keywords naturally into bullets.
9. Skills: 3-5 categories of 3-5 items, most job-relevant first. Include every skill the profile lists, plus tools the job description names that are plausible for this background. Nothing beyond that.
10. American English, active voice, no period ending a bullet, digits for every metric, present tense for the current role and past tense for earlier ones.
11. Never use: several, multiple, various, many, numerous, significant.
12. If the profile has any NYSC data it MUST appear as its own education entry — degree "National Youth Service Corps (NYSC)", school the PPA, location the state of deployment, period the year. Non-negotiable for Nigerian applications. Status "Exempted" becomes degree "NYSC Exemption Certificate".
13. Certifications relevant to the job join the education array as degree "Name — Organisation (Year)". Omit irrelevant ones.
14. Standard sections only. No tables, columns, graphics or icons. Dates as "Mon YYYY - Mon YYYY".

Return ONLY raw JSON — no markdown, no backticks, no commentary — in exactly this shape:
{"jobType":"Technical|Managerial|Consulting|Research|General","matchScore":<0-100>,"keywords":["k1","k2","k3","k4","k5"],"suggestions":["change made","keyword injected","cut made"],"structured":{"name":"","contact":"City, Country | phone | email | linkedin | github","summary":"","experience":[{"title":"","company":"","location":"","period":"","bullets":["","",""]}],"projects":[{"name":"","period":"","bullets":["",""]}],"education":[{"degree":"","school":"","location":"","period":"","gpa":""}],"skills":{"Category":"skill, skill, skill"}}}

Keep bullets tight so the JSON closes well inside the token budget.`;

    const experienceBlock = (profile.experience ?? [])
      .map((exp: any) =>
        `${exp.title} at ${exp.company}, ${exp.location} (${exp.period})\n${clip(exp.bullets?.join(" "), MAX_EXPERIENCE_CHARS)}`
      )
      .join("\n") || "None provided";

    const projectsBlock = (profile.projects ?? [])
      .map((proj: any) =>
        `${proj.name} (${proj.period}): ${clip(proj.bullets?.join(" "), MAX_PROJECT_CHARS)}`
      )
      .join("\n") || "None provided";

    const educationBlock = (profile.education ?? [])
      .map((edu: any) =>
        `${edu.degree} — ${edu.school}, ${edu.location} (${edu.period})${edu.gpa ? ` GPA: ${edu.gpa}` : ""}`
      )
      .join("\n") || "None provided";

    const skillsBlock = (profile.skills ?? [])
      .map((s: any) => `${s.category}: ${s.values}`)
      .join(" | ") || "None provided";

    const nyscBlock = profile.nationalService?.status
      ? [
          profile.nationalService.status,
          profile.nationalService.stateOfDeployment,
          profile.nationalService.year,
          profile.nationalService.ppa ? `PPA: ${profile.nationalService.ppa}` : "",
        ].filter(Boolean).join(", ")
      : "Not provided";

    const certificationsBlock = (profile.certifications ?? [])
      .map((c: any) => `${c.name} (${c.issuingOrg}, ${c.year})`)
      .join("; ") || "None";

    const userPrompt = `TARGET JOB
Company: ${company || "Not specified"}
Role: ${role || "See job description"}
Job Description: ${clip(jobDescription, MAX_JD_CHARS)}

CANDIDATE PROFILE
Name: ${profile.name ?? ""}
Location: ${profile.location ?? ""}
Contact: ${profile.phone ?? ""} | ${profile.email ?? ""}
LinkedIn: ${profile.linkedin ?? ""}
GitHub: ${profile.github ?? ""}
Summary: ${clip(profile.summary, 300)}

EXPERIENCE
${experienceBlock}

PROJECTS
${projectsBlock}

EDUCATION
${educationBlock}

SKILLS: ${skillsBlock}

NYSC: ${nyscBlock}

CERTIFICATIONS: ${certificationsBlock}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    console.log("[generate-cv] prompt size", {
      systemChars: systemPrompt.length,
      userChars: userPrompt.length,
      totalChars: systemPrompt.length + userPrompt.length,
      roughPromptTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
      maxTokens: MAX_COMPLETION_TOKENS,
      model: MODEL,
    });

    if (DEBUG_PROMPT) {
      console.log(
        "[generate-cv] FULL PROMPT (contains personal data)",
        JSON.stringify(messages, null, 2)
      );
    }

    const completion = await createCompletionWithRetry(
      { model: MODEL, messages, temperature: 0.7, max_tokens: MAX_COMPLETION_TOKENS },
      deadlineAt
    );

    const choice = completion.choices?.[0];
    const raw = choice?.message?.content ?? "";
    const finishReason = choice?.finish_reason;

    // finish_reason === "length" is the definitive signal that the token
    // ceiling cut the response off, as opposed to any other failure.
    console.log("[generate-cv] response", {
      finishReason,
      truncatedByTokenLimit: finishReason === "length",
      rawChars: raw.length,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
      elapsedMs: Date.now() - startedAt,
    });

    if (finishReason === "length") {
      console.log("Response cut off — finish_reason: length");
    }

    if (!raw.trim()) {
      console.error("[generate-cv] model returned an empty body", {
        finishReason,
        usage: completion.usage,
      });
      return NextResponse.json(
        {
          // Empty content with finish_reason "length" means the model burned the
          // whole budget before writing anything — a different fault from a
          // model that simply returned nothing.
          error: finishReason === "length"
            ? "The model used its entire token budget before writing the CV. Please try again."
            : "The model returned an empty response. Please try again.",
          reason: finishReason === "length" ? "budget_exhausted" : "empty_response",
        },
        { status: 500 }
      );
    }

    const parsed = parseModelJson(raw);
    const result = usableResumePayload(parsed);

    if (!result) {
      // The tail is where truncation shows, and it carries less personal data
      // than the head of the JSON.
      console.error("[generate-cv] unusable payload", {
        finishReason,
        rawChars: raw.length,
        repairedToObject: !!parsed,
        rawTail: raw.slice(-400),
      });
      return NextResponse.json(
        {
          error: finishReason === "length"
            ? "Response was too long and got cut off. Try a shorter job description."
            : "Failed to generate CV — please try again",
          reason: finishReason === "length" ? "truncated" : "unparseable",
        },
        { status: 500 }
      );
    }

    console.log("[generate-cv] success", {
      experience: result.structured.experience.length,
      projects: result.structured.projects.length,
      education: result.structured.education.length,
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      (error instanceof Error && error.message.includes("rate_limit_exceeded"));

    console.error("[generate-cv] request failed", {
      status: error?.status,
      type: error?.error?.type,
      message: error?.message,
      elapsedMs: Date.now() - startedAt,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: isRateLimit
          ? "We're experiencing high demand right now. Please try again in a moment."
          : "Failed to generate CV",
        reason: isRateLimit ? "rate_limit" : "server_error",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
