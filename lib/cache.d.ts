import { CacheProvider, CacheOptions, WrapOptions } from "./types/index.js";
/**
 * Cache - the heart of the operation
 * Handles all cache operations with any provider (memory, Redis, Memcached)
 * You can customize the prefix for namespace separation
 */
export declare class Cache {
    private provider;
    private logger;
    private prefix;
    constructor(provider?: CacheProvider, prefix?: string);
    get<T = any>(key: string): Promise<T | undefined>;
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
    wrap<T = any>(key: string, fn: () => Promise<T> | T, options?: WrapOptions): Promise<T>;
}
