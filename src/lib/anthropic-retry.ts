import Anthropic from "@anthropic-ai/sdk";

export interface RetryOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 800;

/**
 * HTTP statuses Anthropic uses for transient issues worth retrying:
 * - 429: rate limited
 * - 500, 502, 503: server error
 * - 529: overloaded
 */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 529]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return RETRYABLE_STATUSES.has(err.status ?? 0);
  }
  // Bare fetch / network-level failures — also retryable
  if (err instanceof Error && /fetch|network|ECONN|timeout/i.test(err.message)) {
    return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run an Anthropic call with exponential backoff + jitter on overload (529),
 * rate limit (429), and transient 5xx. Non-retryable errors throw immediately.
 */
export async function withAnthropicRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxRetries) {
        throw err;
      }
      // Exponential backoff with jitter: 800ms, 1600ms, 3200ms, 6400ms (+ up to 400ms random)
      const wait = baseDelay * Math.pow(2, attempt) + Math.random() * 400;
      console.warn(
        `Anthropic call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(wait)}ms:`,
        err instanceof Error ? err.message : err
      );
      await delay(wait);
    }
  }
  throw lastErr;
}
