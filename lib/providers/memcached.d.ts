import type { CacheProvider } from "../types/index.js";
export interface MemcachedProviderOptions {
    hosts?: string | string[];
    keyPrefix?: string;
    timeout?: number;
}
export declare class MemcachedProvider implements CacheProvider {
    private client;
    private hosts;
    private keyPrefix;
    private timeout;
    private ready;
    constructor(options?: MemcachedProviderOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Get value from cache
     */
    get<T = any>(key: string): Promise<T | undefined>;
    /**
     * Set value in cache
     */
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Delete key from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cache (limited Memcached support)
     * Note: Memcached flush_all has performance implications
     */
    clear(): Promise<void>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Get all keys (not natively supported in Memcached)
     * Returns empty array as Memcached doesn't expose key enumeration
     */
    keys(): Promise<string[]>;
    /**
     * Get connection status
     */
    isConnected(): boolean;
}
