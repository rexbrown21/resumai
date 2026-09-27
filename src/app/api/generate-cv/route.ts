import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { parseModelJson, usableResumePayload } from "@/lib/parseModelJson";

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

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, userId } = await req.json();

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

    // Fetch user profile
    const { data, error } = await supabase
      .from("profiles_data")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (error || !data?.profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    const profile = data.profile;
    console.log("Profile data:", JSON.stringify(profile, null, 2));

    const completion = await createCompletionWithRetry({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are a world-class ATS resume writer. Transform the candidate's raw experience into a dense, one-page, ATS-optimized resume tailored to the specific job description.

CONTENT RULES:
1. NEVER invent experience — use only what the candidate provided. Rewrite everything; never copy raw profile text.
2. Include ALL work roles, each with exactly 3 bullets. Include ALL projects, each with exactly 2 bullets. Never drop a role.
3. EVERY bullet must contain a hard number: percentage (40%), multiplier (3x), count (100+ tickets), time saved (8 hours/week), scale (500,000 users), money ($200k), or team size (team of 8). If the notes lack numbers, estimate realistically from role seniority and company size.
4. Keep every bullet to ONE line. Summary is 2 sentences maximum.
5. Inject job-description keywords naturally into bullets. If the JD names a tool the candidate has adjacent experience with, write a bullet demonstrating it — don't just list it under skills.

VERB RULES:
1. Start every bullet with an action verb, and use each verb ONCE across the entire resume — no repeats in any section.
2. BANNED verbs (overused): Developed, Designed, Built, Implemented, Managed, Created, Utilized, Leveraged, Assisted, Supported, Helped, Worked, Responsible, Contributed.
3. Draw from these instead:
   Technical: Architected, Engineered, Deployed, Configured, Integrated, Migrated, Containerized, Provisioned, Automated, Optimized, Refactored, Streamlined, Scaled, Modernized, Instrumented
   Leadership: Led, Spearheaded, Championed, Directed, Coordinated, Facilitated, Mentored, Partnered, Liaised, Unified, Mobilized
   Analysis: Analyzed, Evaluated, Identified, Assessed, Benchmarked, Modeled, Forecasted, Synthesized, Investigated, Audited, Mapped, Diagnosed, Quantified
   Impact: Reduced, Increased, Improved, Accelerated, Eliminated, Saved, Generated, Boosted, Cut, Transformed, Delivered, Achieved, Recovered, Resolved, Exceeded
   Communication: Presented, Documented, Authored, Published, Trained, Advised, Consulted, Negotiated, Pitched, Demonstrated

UNIQUENESS RULES:
1. No two bullets may share more than 3 consecutive words.
2. Never reuse an outcome phrase, a metric phrasing, or a named tool anywhere else on the resume.
3. Each role tells a different story — if role 1 is about automation, role 2 leads on a different theme.

STYLE RULES:
- Perfect American English, active voice only, no passive constructions.
- No periods at the end of bullets. No comma splices.
- Capitalize proper nouns, company names, products and acronyms only — not job titles mid-sentence.
- Digits for all percentages and metrics (3x, 40%, $200k); spell out one through nine elsewhere.
- Present tense for the current role, past tense for prior roles — no mixing within a role.
- Never use vague quantifiers: several, multiple, various, many, numerous, significant.

SKILLS RULES:
- Organize into 3-5 categories of 3-5 items, most JD-relevant category first.
- BASE: include every skill the candidate listed — these are confirmed.
- SUPPLEMENT: add tools, frameworks and methodologies named in the JD that are plausible given their background (knows Python + JD wants FastAPI → add FastAPI).
- INCLUSION TEST: a skill qualifies only if the candidate listed it, OR the JD names it AND it is plausible for them. Never fabricate beyond that.
- Technical roles: categories like Programming Languages, Frameworks & Libraries, Tools & Platforms, Cloud & Infrastructure, AI/ML & Automation.
- Non-technical roles: role competencies (Project Management, Stakeholder Engagement, Data Analysis), JD-named domain tools (Excel, Salesforce, Tableau), and soft skills ONLY where the JD explicitly lists them.

SECTOR TAILORING:
1. Identify the JD's sector first: Technical, Business, Creative, Finance, or Hybrid.
2. Technical background + business/consulting JD: lead with business impact, technical method second. Emphasize cost savings, efficiency, stakeholder management, process improvement.
3. Business background + technical JD: surface any tools and systems used, emphasize analytical and systems thinking.
4. Graduate/entry-level programme: lead with academic achievement and GPA, emphasize leadership, teamwork and adaptability, ambitious growth-oriented tone.
5. The summary must bridge the candidate's background to the target role by name — reference the specific company, the specific role, and the problem they are hiring to solve. Vary the opening structure each time (years of experience / key achievement / value brought). Acknowledge transferable skills directly on a sector mismatch.
6. Order roles and bullets by what the JD emphasizes most — a DevOps JD brings DevOps roles to the top.
7. Match the company's tone: startup JD gets direct and entrepreneurial, corporate JD gets structured and professional.

NYSC AND CERTIFICATIONS:
1. CRITICAL: if the profile has ANY NYSC information, it MUST appear as its own Education entry below the degree — non-negotiable for Nigerian applications:
   National Youth Service Corps (NYSC)
   [State of Deployment] | [Year]
   PPA: [Primary Place of Assignment]
2. NYSC status "Exempted" becomes an entry reading: NYSC Exemption Certificate — [Year]
3. Certifications relevant to the JD go in the education array as "Name — Issuing Organisation (Year)", with a certificate ID in brackets after the year if provided. Filter out irrelevant ones.

ATS FORMATTING:
- Standard headers only: Professional Summary, Work Experience, Projects, Education, Skills.
- No tables, columns, graphics, photos, colors or icons. No special characters beyond hyphens and pipes.
- Dates as Mon YYYY - Mon YYYY.

EXAMPLE TRANSFORMATION:
- Raw: "I resolved customer tickets and helped with automation"
- Output: "Resolved 100+ customer support tickets achieving 95% satisfaction rate while automating repetitive workflows using n8n"

Before returning, verify: no verb repeats, every bullet has a number, no phrase appears twice. Fix any failures first.

Respond ONLY with valid JSON — no markdown, no backticks, no explanation outside the JSON. Keep bullets tight so the response fits well within the token budget.

Respond in this exact JSON format:
{
  "jobType": "Technical|Managerial|Consulting|Research|General",
  "matchScore": <number 0-100>,
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggestions": [
    "Specific transformation made and why it strengthens the resume",
    "Specific keyword injected and where",
    "Specific cut made to keep it one page"
  ],
  "structured": {
    "name": "Full Name",
    "contact": "City, Country | phone | email | linkedin | github",
    "summary": "One powerful sentence about who they are. One sentence about what they bring to this specific role.",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, Country",
        "period": "Mon YYYY - Mon YYYY",
        "bullets": [
          "Action verb + what you did + quantified impact",
          "Action verb + what you did + quantified impact",
          "Action verb + what you did + quantified impact"
        ]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "period": "YYYY",
        "bullets": [
          "Action verb + what you built + tech stack + impact"
        ]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "school": "School Name",
        "location": "City, Country",
        "period": "YYYY - YYYY",
        "gpa": "X.XX/5"
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
          content: `IMPORTANT: This CV must be uniquely crafted for this specific job at this specific company. Do not use a template. Read the JD carefully, identify what this company values most, and build the entire CV around demonstrating exactly that. The candidate's raw experience is the raw material — your job is to sculpt it into the perfect fit for THIS role.

JOB DESCRIPTION:
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
${profile.skills?.map((s: any) => `${s.category}: ${s.values}`).join("\n")}

NATIONAL SERVICE (NYSC):
${profile.nationalService?.status
  ? `Status: ${profile.nationalService.status}
State of Deployment: ${profile.nationalService.stateOfDeployment || "Not specified"}
Year Completed: ${profile.nationalService.year || "Not specified"}
PPA: ${profile.nationalService.ppa || "Not specified"}`
  : "NYSC information not provided"}

CERTIFICATIONS:
${profile.certifications?.length > 0
  ? profile.certifications.map((c: any) =>
      `- ${c.name} issued by ${c.issuingOrg} in ${c.year}${c.certId ? ` (ID: ${c.certId})` : ""}`
    ).join("\n")
  : "No certifications listed"}`,
        },
      ],
      temperature: 0.7,
      // Kept low deliberately: the CV JSON fits well under this, and a smaller
      // ceiling reduces the chance of running into Groq's per-minute token
      // limit mid-response.
      max_tokens: 2000,
    });

    const result = usableResumePayload(
      parseModelJson(completion.choices[0].message.content || "")
    );
    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate CV — please try again" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes("rate_limit_exceeded") ||
        (error as any).status === 429);

    console.error("Generate CV error:", error);
    return NextResponse.json(
      {
        error: isRateLimit
          ? "We're experiencing high demand right now. Please try again in a moment."
          : "Failed to generate CV",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}