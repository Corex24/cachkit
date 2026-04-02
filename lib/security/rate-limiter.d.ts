export interface RateLimitConfig {
    enabled: boolean;
    maxRequestsPerWindow?: number;
    windowMs?: number;
}
export interface RateLimitState {
    requestCount: number;
    windowStart: number;
}
export declare class RateLimiter {
    private windowMs;
    private maxRequests;
    private requestWindows;
    constructor(maxRequestsPerWindow?: number, windowMs?: number);
    isAllowed(identifier?: string): boolean;
    /**
     * Gets remaining requests in current window
     */
    getRemaining(identifier?: string): number;
    /**
     * Gets time until window resets (ms)
     */
    getResetTime(identifier?: string): number;
    /**
     * Resets rate limit for identifier
     */
    reset(identifier?: string): void;
    /**
     * Cleanup old windows to prevent memory leak
     */
    cleanup(): number;
}
/**
 * Creates a rate limiter from config
 */
export declare function createRateLimiter(config: RateLimitConfig): RateLimiter | null;
