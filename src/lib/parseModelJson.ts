/**
 * Parses a model's JSON reply, repairing the common truncation case.
 *
 * Groq enforces a tokens-per-minute ceiling, and when a response runs into it
 * the JSON arrives cut off mid-object — `JSON.parse` then throws and the whole
 * generation is lost. Rather than fail outright, rewind to the last complete
 * `}` or `]` and close whatever is still open: a partial resume the user can
 * see and regenerate beats a blank error screen.
 *
 * Returns null when the reply is too mangled to recover, so callers can decide
 * the status code and message themselves.
 *
 * Caveat: a repaired object is genuinely incomplete — trailing sections (often
 * skills or education) may be missing, since they are what got cut.
 */
export function parseModelJson(raw: string): any | null {
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Not valid as-is — fall through and try to repair a truncated reply.
  }

  const lastValid = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (lastValid <= 0) return null;

  // Drop the incomplete tail, then balance the brackets left open behind it.
  let repaired = clean.substring(0, lastValid + 1);
  const countOf = (pattern: RegExp) => (repaired.match(pattern) || []).length;

  for (let i = countOf(/\[/g) - countOf(/\]/g); i > 0; i--) repaired += "]";
  for (let i = countOf(/\{/g) - countOf(/\}/g); i > 0; i--) repaired += "}";

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

/**
 * Confirms a (possibly repaired) resume payload still has enough in it to
 * render, and backfills the array fields the results page maps over without
 * guarding. Heavy truncation can yield valid JSON whose `structured` block
 * never arrived — returning that would white-screen the client instead of
 * showing an error, so treat it as a failure.
 */
export function usableResumePayload(parsed: any): any | null {
  const structured = parsed?.structured;
  if (!structured?.name || !Array.isArray(structured.experience) || structured.experience.length === 0) {
    return null;
  }

  return {
    ...parsed,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    structured: {
      ...structured,
      projects: Array.isArray(structured.projects) ? structured.projects : [],
      education: Array.isArray(structured.education) ? structured.education : [],
      skills: structured.skills ?? null,
    },
  };
}
