// Deterministic resume audit engine.
//
// Runs the fixed rubric (4 categories × 25 points) against the raw resume text.
// The /api/audit route uses these results two ways: as grounding signals passed
// to the model so its flags reference real findings, and as the authoritative
// scores + fallback report if the model returns unusable JSON.

export const ROLE_TYPES = [
  "Technical",
  "Product",
  "Design",
  "Marketing",
  "Operations",
  "Finance",
  "Other",
] as const;

export type RoleType = (typeof ROLE_TYPES)[number];

export const ROLE_KEYWORDS: Record<RoleType, string[]> = {
  Technical: ["python", "javascript", "api", "database", "system", "engineer", "development", "code"],
  Product: ["roadmap", "stakeholder", "user research", "metrics", "prioritization", "product"],
  Design: ["figma", "prototype", "user experience", "wireframe", "visual", "design system"],
  Marketing: ["campaign", "growth", "conversion", "analytics", "content", "brand", "engagement"],
  Operations: ["process", "efficiency", "workflow", "coordination", "vendor", "logistics"],
  Finance: ["financial", "budget", "forecast", "analysis", "revenue", "reporting", "compliance"],
  Other: ["project", "team", "client", "stakeholder", "analysis", "deliver", "improve", "report"],
};

export type FlagStatus = "good" | "warning" | "critical";

export interface AuditFlag {
  status: FlagStatus;
  message: string;
}

export interface AuditCategory {
  score: number;
  flags: AuditFlag[];
}

export interface AuditReport {
  overall_score: number;
  structure: AuditCategory;
  ats: AuditCategory;
  achievement_quality: AuditCategory;
  role_fit: AuditCategory;
  top_3_fixes: string[];
}

const WEAK_VERBS = ["managed", "helped", "worked on", "responsible for", "assisted", "supported"];

const GENERIC_SUMMARY_PHRASES = [
  "passionate",
  "hardworking",
  "hard-working",
  "team player",
  "go-getter",
  "results-driven",
];

const NON_STANDARD_HEADINGS = [
  "my journey",
  "my story",
  "who i am",
  "what i do",
  "about me",
  "my background",
  "career highlights so far",
  "the story so far",
  "my adventures",
];

const OUTCOME_WORDS = [
  "increased",
  "reduced",
  "improved",
  "grew",
  "saved",
  "cut",
  "achieved",
  "generated",
  "delivered",
  "launched",
  "resulting in",
  "led to",
  "boosted",
  "accelerated",
  "drove",
];

// Common resume action verbs, used to spot the same verb leaned on repeatedly.
const ACTION_VERBS = [
  "built", "created", "designed", "developed", "led", "managed", "improved", "increased",
  "reduced", "launched", "delivered", "implemented", "drove", "owned", "analyzed", "automated",
  "coordinated", "supported", "assisted", "helped", "maintained", "optimized", "grew", "scaled",
  "collaborated", "researched", "tested", "deployed", "migrated", "trained", "presented", "wrote",
];

/** Splits extracted resume text into bullet-ish segments. PDF extraction often
 *  collapses a page into one line, so bullet glyphs matter as much as newlines. */
function splitBullets(text: string): string[] {
  return text
    .split(/[•▪●‣◦·]|\n|(?:^|\s)[-–—]\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25);
}

function countKeywords(lower: string, keywords: string[]): string[] {
  return keywords.filter((k) => lower.includes(k));
}

function extractSummary(text: string): string {
  const match = text.match(
    /(professional\s+summary|summary|profile|objective|about\s+me)([\s\S]{0,700})/i
  );
  return match ? match[2] : text.slice(0, 600);
}

function auditStructure(text: string): AuditCategory {
  const flags: AuditFlag[] = [];
  let score = 25;

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  if (hasEmail || hasPhone) {
    flags.push({ status: "good", message: "Contact information is present and readable." });
  } else {
    score -= 5;
    flags.push({ status: "critical", message: "No email or phone number found — recruiters cannot reach you." });
  }

  if (/(professional\s+summary|^\s*summary|\bsummary\b|profile|objective)/im.test(text)) {
    flags.push({ status: "good", message: "A professional summary section is present." });
  } else {
    score -= 5;
    flags.push({ status: "critical", message: "No professional summary — add a 2–3 sentence positioning statement at the top." });
  }

  if (/(experience|employment|work history|professional background)/i.test(text)) {
    flags.push({ status: "good", message: "An experience section is present." });
  } else {
    score -= 3;
    flags.push({ status: "critical", message: "No experience section detected." });
  }

  if (/(education|academic|university|bachelor|b\.?sc|m\.?sc|degree|diploma)/i.test(text)) {
    flags.push({ status: "good", message: "An education section is present." });
  } else {
    score -= 3;
    flags.push({ status: "warning", message: "No education section detected — most ATS templates expect one." });
  }

  if (/(skills|technical skills|core competenc|competencies|toolkit)/i.test(text)) {
    flags.push({ status: "good", message: "A skills section is present." });
  } else {
    score -= 3;
    flags.push({ status: "warning", message: "No skills section detected — add one so keyword matching can find you." });
  }

  const quantified = /\d+\s?%|[$€£₦¥]\s?[\d,]+|\b\d[\d,]{2,}\b|\b\d+x\b/i.test(text);
  if (quantified) {
    flags.push({ status: "good", message: "At least one quantified achievement was found." });
  } else {
    score -= 6;
    flags.push({ status: "critical", message: "No numbers, percentages or currency anywhere — nothing in this resume is measurable." });
  }

  return { score: Math.max(0, score), flags };
}

function auditAts(text: string, lower: string, roleType: RoleType): AuditCategory {
  const flags: AuditFlag[] = [];
  let score = 25;

  const oddHeadings = NON_STANDARD_HEADINGS.filter((h) => lower.includes(h));
  if (oddHeadings.length > 0) {
    score -= 5;
    flags.push({
      status: "warning",
      message: `Non-standard section heading detected ("${oddHeadings[0]}") — ATS parsers look for standard labels like "Experience".`,
    });
  } else {
    flags.push({ status: "good", message: "Section headings use standard, ATS-readable labels." });
  }

  const yearMatches = text.match(/\b(19|20)\d{2}\b/g) || [];
  const monthYear = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19|20)\d{2}/i.test(text);
  if (yearMatches.length >= 2 || monthYear) {
    flags.push({ status: "good", message: "Dates are present on your experience entries." });
  } else {
    score -= 5;
    flags.push({ status: "critical", message: "Experience entries are missing start/end dates — ATS systems cannot build your timeline." });
  }

  const specials = (text.match(/[^\w\s.,;:'"()\-–—&/@%$€£₦+#*•|\[\]]/g) || []).length;
  if (specials > Math.max(20, text.length * 0.01)) {
    score -= 3;
    flags.push({ status: "warning", message: "Unusual special characters or symbols detected — these often garble on parse." });
  } else {
    flags.push({ status: "good", message: "No excessive special characters that would break parsing." });
  }

  const found = countKeywords(lower, ROLE_KEYWORDS[roleType]);
  if (found.length >= 3) {
    flags.push({
      status: "good",
      message: `Found ${found.length} ${roleType.toLowerCase()} keywords: ${found.slice(0, 5).join(", ")}.`,
    });
  } else {
    score -= 12;
    flags.push({
      status: "critical",
      message: `Only ${found.length} keyword${found.length === 1 ? "" : "s"} relevant to ${roleType} roles found — keyword screens will filter this out.`,
    });
  }

  return { score: Math.max(0, score), flags };
}

function auditAchievementQuality(text: string, lower: string): AuditCategory {
  const flags: AuditFlag[] = [];
  let score = 25;
  const bullets = splitBullets(text);

  const weakFound = WEAK_VERBS.filter((v) => lower.includes(v));
  if (weakFound.length > 0) {
    score -= 5;
    flags.push({
      status: "warning",
      message: `Weak phrasing detected (${weakFound.slice(0, 3).join(", ")}) — swap for verbs that show ownership and impact.`,
    });
  } else {
    flags.push({ status: "good", message: "Bullets lead with strong action verbs." });
  }

  const verbCounts = ACTION_VERBS.map((v) => ({
    verb: v,
    count: (lower.match(new RegExp(`\\b${v}\\b`, "g")) || []).length,
  })).filter((v) => v.count >= 3);
  if (verbCounts.length > 0) {
    score -= 5;
    const worst = verbCounts.sort((a, b) => b.count - a.count)[0];
    flags.push({
      status: "warning",
      message: `"${worst.verb}" is used ${worst.count} times — vary your verbs so bullets don't read as repetitive.`,
    });
  } else {
    flags.push({ status: "good", message: "Action verbs are varied across bullets." });
  }

  const outcomeBullets = bullets.filter(
    (b) => /\d+\s?%|[$€£₦¥]\s?[\d,]+|\b\d[\d,]{2,}\b/.test(b) ||
      OUTCOME_WORDS.some((w) => b.toLowerCase().includes(w))
  );
  if (outcomeBullets.length >= 2) {
    flags.push({ status: "good", message: `${outcomeBullets.length} bullets describe a concrete outcome rather than a task.` });
  } else {
    score -= 10;
    flags.push({
      status: "critical",
      message: `Only ${outcomeBullets.length} bullet${outcomeBullets.length === 1 ? "" : "s"} states an actual result — the rest read as job duties.`,
    });
  }

  const responsibilityBullets = bullets.filter((b) =>
    /^(responsible for|managed)/i.test(b.trim())
  );
  if (bullets.length > 0 && responsibilityBullets.length > bullets.length / 2) {
    score -= 5;
    flags.push({
      status: "critical",
      message: `${responsibilityBullets.length} of ${bullets.length} bullets open with "responsible for" or "managed" — rewrite them around what changed because of you.`,
    });
  } else {
    flags.push({ status: "good", message: "Bullets are framed as achievements, not a list of responsibilities." });
  }

  return { score: Math.max(0, score), flags };
}

function auditRoleFit(text: string, lower: string, roleType: RoleType, company: string): AuditCategory {
  const flags: AuditFlag[] = [];
  let score = 25;

  const found = countKeywords(lower, ROLE_KEYWORDS[roleType]);
  if (found.length >= 2) {
    flags.push({
      status: "good",
      message: `Your resume signals ${roleType.toLowerCase()} work through: ${found.slice(0, 5).join(", ")}.`,
    });
  } else {
    score -= 15;
    flags.push({
      status: "critical",
      message: `Almost nothing here reads as a ${roleType} resume — only ${found.length} relevant term${found.length === 1 ? "" : "s"} found.`,
    });
  }

  const yearsMatch = lower.match(/(\d{1,2})\+?\s*(?:years|yrs)\b/);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  const seniorTitle = /(senior|lead|principal|head of|director|vp |chief|manager)/i.test(text);
  const juniorTitle = /(intern|junior|entry[- ]level|graduate trainee|nysc)/i.test(text);

  if (years !== null && seniorTitle && years < 3) {
    score -= 5;
    flags.push({
      status: "warning",
      message: `You claim senior-level titles but only ${years} year${years === 1 ? "" : "s"} of experience — that mismatch reads as a red flag.`,
    });
  } else if (years !== null && years >= 8 && !seniorTitle) {
    score -= 5;
    flags.push({
      status: "warning",
      message: `${years} years of experience with no scope or leadership signals — your seniority is being under-sold.`,
    });
  } else if (years === null && !seniorTitle && !juniorTitle) {
    score -= 5;
    flags.push({
      status: "warning",
      message: "No clear seniority signal — state your years of experience or level so screeners can place you.",
    });
  } else {
    flags.push({ status: "good", message: "Seniority signals are consistent with the roles you're targeting." });
  }

  const summary = extractSummary(text);
  const summaryLower = summary.toLowerCase();
  const genericFound = GENERIC_SUMMARY_PHRASES.filter((p) => summaryLower.includes(p));
  const summaryHasSpecifics = /\d/.test(summary) || countKeywords(summaryLower, ROLE_KEYWORDS[roleType]).length > 0;
  if (genericFound.length > 0 && !summaryHasSpecifics) {
    score -= 5;
    flags.push({
      status: "warning",
      message: `Your summary leans on filler ("${genericFound[0]}") without a single specific skill, tool or number.`,
    });
  } else {
    flags.push({
      status: "good",
      message: company
        ? `Summary is specific enough to be adapted for ${company}.`
        : "Summary is specific rather than generic filler.",
    });
  }

  return { score: Math.max(0, score), flags };
}

/** Derives the three highest-value fixes from the critical/warning flags. */
function deriveTopFixes(categories: AuditCategory[]): string[] {
  const ranked = [
    ...categories.flatMap((c) => c.flags.filter((f) => f.status === "critical")),
    ...categories.flatMap((c) => c.flags.filter((f) => f.status === "warning")),
  ];
  const fixes = ranked.slice(0, 3).map((f) => f.message);
  while (fixes.length < 3) {
    fixes.push("Tailor this resume to a specific job description to lift keyword and role-fit scores.");
  }
  return fixes;
}

/** Runs the full rubric. Scores are authoritative; flags are a usable fallback. */
export function runAuditChecks(
  resumeText: string,
  roleType: RoleType,
  company: string
): AuditReport {
  const text = resumeText;
  const lower = text.toLowerCase();

  const structure = auditStructure(text);
  const ats = auditAts(text, lower, roleType);
  const achievement_quality = auditAchievementQuality(text, lower);
  const role_fit = auditRoleFit(text, lower, roleType, company);

  return {
    overall_score: structure.score + ats.score + achievement_quality.score + role_fit.score,
    structure,
    ats,
    achievement_quality,
    role_fit,
    top_3_fixes: deriveTopFixes([structure, ats, achievement_quality, role_fit]),
  };
}
