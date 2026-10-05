import Groq from "groq-sdk";

/**
 * Shared Groq call wrapper with rate-limit retry.
 *
 * This existed as three separate copies in the route files and they drifted:
 * two used a 2s/4s/8s backoff that could sleep 14 seconds inside a serverless
 * function, and only one had a deadline guard. One implementation removes that
 * class of bug.
 */

type CompletionParams = Parameters<Groq["chat"]["completions"]["create"]>[0];

/** Headroom under each route's `maxDuration` so we return JSON ourselves
 *  rather than being killed mid-request (a kill returns a non-JSON body). */
export const GROQ_TIME_BUDGET_MS = 50_000;

export function isRateLimitError(error: any): boolean {
  return (
    error?.status === 429 ||
    error?.error?.type === "rate_limit_error" ||
    !!error?.message?.includes("rate_limit_exceeded")
  );
}

export async function createCompletionWithRetry(
  groq: Groq,
  params: CompletionParams,
  options: { deadlineAt?: number; label?: string } = {}
): Promise<Groq.Chat.ChatCompletion> {
  const { deadlineAt, label = "groq" } = options;
  const maxAttempts = 3;
  const backoffMs = [1500, 3000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return (await groq.chat.completions.create(
        params
      )) as Groq.Chat.ChatCompletion;
    } catch (error: any) {
      const rateLimited = isRateLimitError(error);

      console.error(`[${label}] groq attempt ${attempt + 1} failed`, {
        status: error?.status,
        type: error?.error?.type,
        message: error?.message,
        rateLimited,
        stack: error?.stack,
      });

      if (!rateLimited || attempt === maxAttempts - 1) throw error;

      // Don't start a wait-plus-inference cycle that cannot finish inside the
      // budget — being killed by the platform loses the JSON error body the
      // client needs to show a real message.
      const waitMs = backoffMs[attempt] ?? 3000;
      if (deadlineAt && Date.now() + waitMs + 10_000 > deadlineAt) {
        console.error(`[${label}] abandoning retries: not enough time budget left`);
        throw error;
      }

      console.log(`[${label}] rate limited, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("rate_limit_exceeded");
}
