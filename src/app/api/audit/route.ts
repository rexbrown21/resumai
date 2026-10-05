import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  runAuditChecks,
  ROLE_TYPES,
  ROLE_KEYWORDS,
  AuditCategory,
  AuditFlag,
  AuditReport,
  FlagStatus,
  RoleType,
} from "@/lib/auditRules";

// Without this the platform kills long generations and returns a non-JSON
// body, which the client surfaces as a raw JSON parse error.
export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

const VALID_STATUSES: FlagStatus[] = ["good", "warning", "critical"];

/** Keeps only well-formed flags from the model, capped so a category stays readable. */
function sanitizeFlags(raw: unknown, fallback: AuditFlag[]): AuditFlag[] {
  if (!Array.isArray(raw)) return fallback;
  const cleaned = raw
    .filter(
      (f: any) =>
        f &&
        typeof f.message === "string" &&
        f.message.trim().length > 0 &&
        VALID_STATUSES.includes(f.status)
    )
    .slice(0, 8)
    .map((f: any) => ({ status: f.status as FlagStatus, message: f.message.trim() }));
  return cleaned.length > 0 ? cleaned : fallback;
}

/** Scores come from the deterministic rubric — only the wording is the model's. */
function mergeCategory(raw: unknown, baseline: AuditCategory): AuditCategory {
  const obj = (raw ?? {}) as any;
  return {
    score: baseline.score,
    flags: sanitizeFlags(obj.flags, baseline.flags),
  };
}

function mergeReport(raw: any, baseline: AuditReport): AuditReport {
  const structure = mergeCategory(raw?.structure, baseline.structure);
  const ats = mergeCategory(raw?.ats, baseline.ats);
  const achievement_quality = mergeCategory(
    raw?.achievement_quality,
    baseline.achievement_quality
  );
  const role_fit = mergeCategory(raw?.role_fit, baseline.role_fit);

  const modelFixes = Array.isArray(raw?.top_3_fixes)
    ? raw.top_3_fixes.filter((f: unknown) => typeof f === "string" && f.trim().length > 0)
    : [];
  const top_3_fixes = modelFixes.length >= 3
    ? modelFixes.slice(0, 3).map((f: string) => f.trim())
    : baseline.top_3_fixes;

  return {
    overall_score:
      structure.score + ats.score + achievement_quality.score + role_fit.score,
    structure,
    ats,
    achievement_quality,
    role_fit,
    top_3_fixes,
  };
}

/** Compact summary of the rubric findings, so the model writes about real evidence. */
function signalsForPrompt(baseline: AuditReport): string {
  const line = (name: string, c: AuditCategory) =>
    `${name} (${c.score}/25):\n` +
    c.flags.map((f) => `  - [${f.status}] ${f.message}`).join("\n");

  return [
    line("Structure & Completeness", baseline.structure),
    line("ATS Compatibility", baseline.ats),
    line("Achievement Quality", baseline.achievement_quality),
    line("Role/Company Fit", baseline.role_fit),
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, roleType, company } = await req.json();

    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json(
        { error: "Resume text is required" },
        { status: 400 }
      );
    }

    if (resumeText.trim().length < 200) {
      return NextResponse.json(
        { error: "This resume looks incomplete — please upload the full document." },
        { status: 400 }
      );
    }

    const role: RoleType = ROLE_TYPES.includes(roleType) ? roleType : "Other";
    const companyName = typeof company === "string" ? company.trim() : "";

    const baseline = runAuditChecks(resumeText, role, companyName);

    let parsed: any = null;
    try {
      const completion = await createCompletionWithRetry({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `You are an expert resume auditor and ATS specialist. Analyze the provided resume and return a JSON audit report. Be specific and actionable in your feedback. Never make up information not in the resume.

Return ONLY valid JSON in this exact format:
{
  "overall_score": <number 0-100>,
  "structure": {
    "score": <number 0-25>,
    "flags": [
      {
        "status": "good" | "warning" | "critical",
        "message": "<specific finding>"
      }
    ]
  },
  "ats": {
    "score": <number 0-25>,
    "flags": [...]
  },
  "achievement_quality": {
    "score": <number 0-25>,
    "flags": [...]
  },
  "role_fit": {
    "score": <number 0-25>,
    "flags": [...]
  },
  "top_3_fixes": [
    "Most important thing to fix first",
    "Second most important fix",
    "Third most important fix"
  ]
}

Role type context: ${role}
Company context (if provided): ${companyName || "none"}
Relevant keywords for this role type: ${ROLE_KEYWORDS[role].join(", ")}
Be specific — reference actual content from the resume in your flags, not generic advice. Each flag must be one short sentence. Respond with raw JSON only — no markdown, no backticks, no explanation.`,
          },
          {
            role: "user",
            content: `RESUME:
${resumeText}

AUTOMATED RUBRIC FINDINGS (already verified against the text — build your flags on these, adding the specific resume detail behind each one):
${signalsForPrompt(baseline)}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      });

      const text = completion.choices[0].message.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch (modelError) {
      // Model unavailable or returned unusable JSON — the rubric report still stands.
      console.error("Audit model error, falling back to rubric report:", modelError);
      const isRateLimit =
        modelError instanceof Error &&
        (modelError.message.includes("rate_limit_exceeded") ||
          (modelError as any).status === 429);
      if (isRateLimit) {
        return NextResponse.json(
          { error: "We're experiencing high demand right now. Please try again in a moment." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(parsed ? mergeReport(parsed, baseline) : baseline);
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: "Failed to audit resume" },
      { status: 500 }
    );
  }
}
