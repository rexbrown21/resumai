/**
 * The Groq model every AI route uses.
 *
 * This lives in one place because the id previously existed as a separate
 * literal in four route files and they drifted apart — the project has changed
 * models five times, and each migration meant four edits that were easy to do
 * incompletely. Importing a single constant makes a mismatch impossible.
 *
 * Overridable from the environment so a wrong or decommissioned id can be
 * corrected from the hosting dashboard without shipping code.
 */
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";
