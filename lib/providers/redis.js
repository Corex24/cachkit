import * as ioredis from "ioredis";
import { serialize, deserialize } from "../utils/index.js";
const Redis = ioredis.default || ioredis;
// Redis provider for distributed caching
// Perfect for multi-instance deployments where you need shared cache
export class RedisProvider {
    client;
    constructor(options) {
        // Reads Redis host/port from environment variables or uses defaults
        this.client = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            db: parseInt(process.env.REDIS_DB || "0"),
            lazyConnect: true,
        });
    }
    // Get a value from Redis
    async get(key) {
        const buffer = await this.client.getBuffer(key);
        if (!buffer)
            return undefined;
        try {
            const item = deserialize(buffer);
            return item.data;
        }
        catch {
            return undefined;
        }
    }
    // Store a value in Redis with optional TTL
    async set(key, value, ttl) {
        const item = {
            data: value,
            timestamp: Date.now(),
            ttl,
        };
        const buffer = serialize(item);
        if (ttl) {
            await this.client.setex(key, Math.ceil(ttl / 1000), buffer);
        }
        else {
            await this.client.set(key, buffer);
        }
    }
    // Delete a key from Redis
    async delete(key) {
        await this.client.del(key);
    }
    // Clear everything from Redis
    async clear() {
        await this.client.flushdb();
    }
    // Check if a key exists in Redis
    async has(key) {
        const exists = await this.client.exists(key);
        return exists === 1;
    }
    // Get all keys from Redis
    async keys() {
        return this.client.keys("*");
    }
    // Connect to Redis
    // This is usually called automatically when you start using the cache
    async connect() {
        await this.client.connect();
    }
    // Disconnect from Redis
    async disconnect() {
        await this.client.quit();
    }
}
