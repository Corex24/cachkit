// Memcached provider - another option for distributed caching
// Install with: npm install memcached
// Requires a Memcached server running somewhere

import type { CacheProvider } from "../types/index.js";

export interface MemcachedProviderOptions {
  hosts?: string | string[]; // Default: ["localhost:11211"]
  keyPrefix?: string;
  timeout?: number; // Connection timeout in ms
}

// Memcached-based cache provider
// Similar to Redis but with a different feature set
export class MemcachedProvider implements CacheProvider {
  private client: any;
  private hosts: string[];
  private keyPrefix: string;
  private timeout: number;
  private ready: boolean = false;

  constructor(options: MemcachedProviderOptions = {}) {
    const { hosts = ["localhost:11211"], keyPrefix = "cachkit:", timeout = 5000 } = options;

    this.hosts = Array.isArray(hosts) ? hosts : [hosts];
    this.keyPrefix = keyPrefix;
    this.timeout = timeout;
  }

  // Connect to the Memcached server(s)
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency
      const Memcached = (await import("memcached" as any)).default || (await import("memcached" as any));
      this.client = new (Memcached as any)(this.hosts, {
        timeout: this.timeout,
        retries: 3,
        retry: 30000, // retry after 30s
      });

      // Test connection
      await new Promise<void>((resolve, reject) => {
        this.client.touch("__test__", 1, (err: Error | null | any) => {
          if (err && err.message && !err.message.includes("not found")) {
            reject(err);
          } else {
            this.ready = true;
            resolve();
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to connect to Memcached: ${error}`);
    }
  }

  // Disconnect from Memcached
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        try {
          this.client.end(() => {
            this.ready = false;
            resolve();
          });
        } catch {
          this.ready = false;
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    if (!this.ready) throw new Error("Memcached client not connected");

    return new Promise((resolve, reject) => {
      this.client.get(this.keyPrefix + key, (err: Error | null, data: any) => {
        if (err) {
          reject(err);
        } else if (data) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          resolve(undefined);
        }
      });
    });
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.ready) throw new Error("Memcached client not connected");

    return new Promise((resolve, reject) => {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      const lifetime = Math.ceil((ttl || 0) / 1000); // Memcached TTL in seconds

      this.client.set(
        this.keyPrefix + key,
        serialized,
        lifetime,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.ready) throw new Error("Memcached client not connected");

    return new Promise((resolve, reject) => {
      this.client.del(this.keyPrefix + key, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Clear all cache (limited Memcached support)
   * Note: Memcached flush_all has performance implications
   */
  async clear(): Promise<void> {
    if (!this.ready) throw new Error("Memcached client not connected");

    return new Promise((resolve, reject) => {
      this.client.flush((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.ready) throw new Error("Memcached client not connected");

    return new Promise((resolve, reject) => {
      this.client.get(this.keyPrefix + key, (err: Error | null, data: any) => {
        if (err) reject(err);
        else resolve(data !== undefined && data !== null);
      });
    });
  }

  /**
   * Get all keys (not natively supported in Memcached)
   * Returns empty array as Memcached doesn't expose key enumeration
   */
  async keys(): Promise<string[]> {
    // Memcached doesn't support key enumeration for distributed systems
    // This is by design - use Redis if you need key enumeration
    return [];
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ready;
  }
}
