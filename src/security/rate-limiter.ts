// Rate limiting - stop people from abusing your cache
// We use a sliding window approach to track requests

export interface RateLimitConfig {
  enabled: boolean;
  maxRequestsPerWindow?: number; // Operations per time window
  windowMs?: number; // Time window in milliseconds
}

export interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

// Token bucket rate limiter using a sliding window
// Simple but effective for preventing cache abuse
export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requestWindows: Map<string, RateLimitState> = new Map();

  constructor(
    maxRequestsPerWindow: number = 10000,
    windowMs: number = 60000 // 1 minute
  ) {
    this.maxRequests = maxRequestsPerWindow;
    this.windowMs = windowMs;
  }

// Check if an identifier (like a user or IP) is within their rate limit
// Returns true if the request is allowed, false if they've hit the limit
  isAllowed(identifier: string = "default"): boolean {
    const now = Date.now();
    const state = this.requestWindows.get(identifier);

    // No previous requests
    if (!state) {
      this.requestWindows.set(identifier, {
        requestCount: 1,
        windowStart: now,
      });
      return true;
    }

    // Window expired, reset
    if (now - state.windowStart > this.windowMs) {
      this.requestWindows.set(identifier, {
        requestCount: 1,
        windowStart: now,
      });
      return true;
    }

    // Within window, check limit
    if (state.requestCount < this.maxRequests) {
      state.requestCount++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Gets remaining requests in current window
   */
  getRemaining(identifier: string = "default"): number {
    const state = this.requestWindows.get(identifier);
    const now = Date.now();

    if (!state) return this.maxRequests;
    if (now - state.windowStart > this.windowMs) return this.maxRequests;

    return Math.max(0, this.maxRequests - state.requestCount);
  }

  /**
   * Gets time until window resets (ms)
   */
  getResetTime(identifier: string = "default"): number {
    const state = this.requestWindows.get(identifier);
    const now = Date.now();

    if (!state) return 0;

    const timeSinceWindowStart = now - state.windowStart;
    const timeUntilReset = this.windowMs - timeSinceWindowStart;

    return Math.max(0, timeUntilReset);
  }

  /**
   * Resets rate limit for identifier
   */
  reset(identifier?: string): void {
    if (identifier) {
      this.requestWindows.delete(identifier);
    } else {
      this.requestWindows.clear();
    }
  }

  /**
   * Cleanup old windows to prevent memory leak
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, state] of this.requestWindows.entries()) {
      if (now - state.windowStart > this.windowMs * 2) {
        this.requestWindows.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Creates a rate limiter from config
 */
export function createRateLimiter(
  config: RateLimitConfig
): RateLimiter | null {
  if (!config.enabled) return null;

  return new RateLimiter(
    config.maxRequestsPerWindow || 10000,
    config.windowMs || 60000
  );
}
