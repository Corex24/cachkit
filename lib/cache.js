import { pino } from "pino";
import { MemoryProvider } from "./providers/index.js";
import { generateKey } from "./utils/index.js";
/**
 * Cache - the heart of the operation
 * Handles all cache operations with any provider (memory, Redis, Memcached)
 * You can customize the prefix for namespace separation
 */
export class Cache {
    provider;
    logger = pino({ level: process.env.LOG_LEVEL || "info" });
    prefix;
    constructor(provider, prefix = "cache") {
        this.provider = provider ?? new MemoryProvider();
        this.prefix = prefix;
    }
    // Get a value from cache. Returns undefined if it doesn't exist or has expired
    async get(key) {
        try {
            const fullKey = generateKey(this.prefix, key);
            const value = await this.provider.get(fullKey);
            this.logger.debug({ key: fullKey }, "Cache GET");
            return value;
        }
        catch (error) {
            this.logger.error({ key, error }, "Cache GET error");
            return undefined;
        }
    }
    // Store a value in the cache with optional TTL
    async set(key, value, options) {
        try {
            const fullKey = generateKey(this.prefix, key);
            await this.provider.set(fullKey, value, options?.ttl);
            this.logger.debug({ key: fullKey, ttl: options?.ttl }, "Cache SET");
        }
        catch (error) {
            this.logger.error({ key, error }, "Cache SET error");
        }
    }
    // Delete a key from cache
    async delete(key) {
        try {
            const fullKey = generateKey(this.prefix, key);
            await this.provider.delete(fullKey);
            this.logger.debug({ key: fullKey }, "Cache DELETE");
        }
        catch (error) {
            this.logger.error({ key, error }, "Cache DELETE error");
        }
    }
    // Clear everything from the cache
    async clear() {
        try {
            await this.provider.clear();
            this.logger.debug("Cache CLEAR");
        }
        catch (error) {
            this.logger.error({ error }, "Cache CLEAR error");
        }
    }
    // Check if a key exists and hasn't expired
    async has(key) {
        try {
            const fullKey = generateKey(this.prefix, key);
            return await this.provider.has(fullKey);
        }
        catch (error) {
            this.logger.error({ key, error }, "Cache HAS error");
            return false;
        }
    }
    // Get all keys in the cache (filtered by prefix)
    async keys() {
        try {
            const allKeys = await this.provider.keys();
            return allKeys
                .filter((k) => k.startsWith(`${this.prefix}:`))
                .map((k) => k.replace(`${this.prefix}:`, ""));
        }
        catch (error) {
            this.logger.error({ error }, "Cache KEYS error");
            return [];
        }
    }
    // The magic method: cache-aware function wrapper
    // If we have it cached, return it instantly. Otherwise run the function and cache the result
    async wrap(key, fn, options) {
        const cached = await this.get(key);
        if (cached !== undefined) {
            this.logger.debug({ key }, "Cache HIT");
            return cached;
        }
        this.logger.debug({ key }, "Cache MISS");
        const value = await Promise.resolve(fn());
        await this.set(key, value, options);
        return value;
    }
}
