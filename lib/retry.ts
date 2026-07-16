/**
 * Retry utilities for reliable saves to Supabase.
 *
 * Implements exponential backoff retry logic and network-aware retries.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of the function
 * @throws Last error if all attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 8000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this was the last attempt, throw
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, ...
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs,
      );

      // Notify caller about retry
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Retry failed");
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a client-side UUID for a note.
 * Uses the browser's native crypto.randomUUID() if available.
 */
export function generateNoteId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers (very rare in 2026)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
