import { LRUCache } from "lru-cache";
import { CacheProvider, ProviderOptions, SerializableValue } from "../types/index.js";
import { isExpired } from "../utils/index.js";

// In-memory cache provider - fast but doesn't persist across restarts
// Uses LRU (Least Recently Used) eviction when we hit the max size
export class MemoryProvider implements CacheProvider {
  private cache: LRUCache<string, SerializableValue>;

  constructor(options?: ProviderOptions) {
    // Max 500 items by default, but you can customize this
    this.cache = new LRUCache({
      max: options?.maxSize ?? 500,
      ttl: 1000 * 60 * 60,
    });
  }

  // Get a value from memory
  // Returns undefined if it's expired or doesn't exist
  async get<T = any>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (item.ttl && isExpired(item.timestamp, item.ttl)) {
      this.cache.delete(key);
      return undefined;
    }

    return item.data as T;
  }

  // Store a value in memory with an optional TTL
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const item: SerializableValue = {
      data: value,
      timestamp: Date.now(),
      ttl,
    };
    this.cache.set(key, item);
  }

  // Delete a key from memory
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  // Clear everything from memory
  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Check if a key exists
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  // Get all keys currently in storage
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
}
