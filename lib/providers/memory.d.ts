import { CacheProvider, ProviderOptions } from "../types/index.js";
export declare class MemoryProvider implements CacheProvider {
    private cache;
    constructor(options?: ProviderOptions);
    get<T = any>(key: string): Promise<T | undefined>;
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
}
