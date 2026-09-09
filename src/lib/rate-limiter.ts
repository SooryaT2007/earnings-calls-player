/**
 * Minimal client-side token-bucket rate limiter to keep Notion API calls
 * within the ~3 requests per second limit.
 */
export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private running = false;

  constructor(private readonly requestsPerSecond: number = 3) {}

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      if (!this.running) void this.drain();
    });
  }

  private async drain(): Promise<void> {
    this.running = true;
    const intervalMs = 1000 / this.requestsPerSecond;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (current) await current();
      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    this.running = false;
  }
}

export const notionRateLimiter = new RateLimiter(3);

/**
 * Runs an async function, retrying on Notion's rate-limit (429) responses.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      if (status === 429 && attempt < retries) {
        const retryAfter = (error as { retryAfter?: number | string })
          ?.retryAfter;
        const delay =
          (typeof retryAfter === "number"
            ? retryAfter * 1000
            : Number(retryAfter) * 1000) || baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
