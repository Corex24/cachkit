// Memcached provider - another option for distributed caching
// Install with: npm install memcached
// Requires a Memcached server running somewhere
// Memcached-based cache provider
// Similar to Redis but with a different feature set
export class MemcachedProvider {
    client;
    hosts;
    keyPrefix;
    timeout;
    ready = false;
    constructor(options = {}) {
        const { hosts = ["localhost:11211"], keyPrefix = "cachkit:", timeout = 5000 } = options;
        this.hosts = Array.isArray(hosts) ? hosts : [hosts];
        this.keyPrefix = keyPrefix;
        this.timeout = timeout;
    }
    // Connect to the Memcached server(s)
    async connect() {
        try {
            // Dynamic import to avoid hard dependency
            const Memcached = (await import("memcached")).default || (await import("memcached"));
            this.client = new Memcached(this.hosts, {
                timeout: this.timeout,
                retries: 3,
                retry: 30000, // retry after 30s
            });
            // Test connection
            await new Promise((resolve, reject) => {
                this.client.touch("__test__", 1, (err) => {
                    if (err && err.message && !err.message.includes("not found")) {
                        reject(err);
                    }
                    else {
                        this.ready = true;
                        resolve();
                    }
                });
            });
        }
        catch (error) {
            throw new Error(`Failed to connect to Memcached: ${error}`);
        }
    }
    // Disconnect from Memcached
    async disconnect() {
        return new Promise((resolve) => {
            if (this.client) {
                try {
                    this.client.end(() => {
                        this.ready = false;
                        resolve();
                    });
                }
                catch {
                    this.ready = false;
                    resolve();
                }
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Get value from cache
     */
    async get(key) {
        if (!this.ready)
            throw new Error("Memcached client not connected");
        return new Promise((resolve, reject) => {
            this.client.get(this.keyPrefix + key, (err, data) => {
                if (err) {
                    reject(err);
                }
                else if (data) {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        resolve(data);
                    }
                }
                else {
                    resolve(undefined);
                }
            });
        });
    }
    /**
     * Set value in cache
     */
    async set(key, value, ttl) {
        if (!this.ready)
            throw new Error("Memcached client not connected");
        return new Promise((resolve, reject) => {
            const serialized = typeof value === "string" ? value : JSON.stringify(value);
            const lifetime = Math.ceil((ttl || 0) / 1000); // Memcached TTL in seconds
            this.client.set(this.keyPrefix + key, serialized, lifetime, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Delete key from cache
     */
    async delete(key) {
        if (!this.ready)
            throw new Error("Memcached client not connected");
        return new Promise((resolve, reject) => {
            this.client.del(this.keyPrefix + key, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Clear all cache (limited Memcached support)
     * Note: Memcached flush_all has performance implications
     */
    async clear() {
        if (!this.ready)
            throw new Error("Memcached client not connected");
        return new Promise((resolve, reject) => {
            this.client.flush((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Check if key exists
     */
    async has(key) {
        if (!this.ready)
            throw new Error("Memcached client not connected");
        return new Promise((resolve, reject) => {
            this.client.get(this.keyPrefix + key, (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data !== undefined && data !== null);
            });
        });
    }
    /**
     * Get all keys (not natively supported in Memcached)
     * Returns empty array as Memcached doesn't expose key enumeration
     */
    async keys() {
        // Memcached doesn't support key enumeration for distributed systems
        // This is by design - use Redis if you need key enumeration
        return [];
    }
    /**
     * Get connection status
     */
    isConnected() {
        return this.ready;
    }
}
