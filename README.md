# Cachkit

Simple, fast, and powerful caching for Node.js. No config. Just works.

[![npm](https://img.shields.io/npm/v/cachkit.svg)](https://www.npmjs.com/package/cachkit)
[![npm downloads](https://img.shields.io/npm/dm/cachkit.svg)](https://www.npmjs.com/package/cachkit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-157%2F157%20passing-brightgreen.svg)](https://github.com/Corex24/cachkit)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-green.svg)](./SECURITY.md)
[![Performance](https://img.shields.io/badge/Performance-0.1ms--hit-success.svg)](./PERFORMANCE.md)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Cachkit** is a professional-grade caching library that eliminates redundant work. Need to cache database queries? Done. Want to memoize expensive computations? Easy. Deploying across multiple instances and need Redis? We handle that out of the box.

Think of it as the intelligent middleman that remembers everything, so your application doesn't have to work twice.

## The Problem Cachkit Solves

Most Node.js projects waste time on repetitive caching infrastructure:

- Building and maintaining custom cache layer code
- Manually managing time-to-live (TTL) logic
- Switching between different caching strategies for development vs. production
- Handling serialization, key prefixes, and error cases across the codebase

**The Cachkit Way:**

```typescript
const user = await cache.wrap("user:123", () => fetchUser(123));
// That's it. Handles caching, TTL, serialization, errors—everything.
```

One line. No boilerplate. Production-ready.

## Core Features

- **Zero Configuration** — Works out of the box with sensible defaults
- **Multiple Backends** — Seamlessly switch between in-memory, Redis, and Memcached
- **Automatic Memoization** — `wrap()` method caches function results automatically
- **TTL Management** — Smart auto-expiration of stale cached data
- **Enterprise Security** — Input validation, AES-256-GCM encryption, and rate limiting
- **Monitoring & Metrics** — Built-in health checks and performance analytics
- **Full Type Safety** — Complete TypeScript support with proper type inference
- **Minimal Dependencies** — Lightweight implementation at approximately 50KB unpacked
- **Graceful Error Handling** — Never crashes your application, fails safely
- **Comprehensive Testing** — 157 tests covering security, stress, and real-world scenarios

## Installation

```bash
npm install cachkit
```

## Usage

### Simplest Example

```typescript
import { Cache } from "cachkit";

const cache = new Cache();

// Store something
await cache.set("key", "value");

// Retrieve it
const value = await cache.get("key");
```

### Real-World: Database Query Caching

```typescript
async function getUser(userId) {
  return cache.wrap(`user:${userId}`, async () => {
    // This function only runs if cache misses
    const user = await database.query("SELECT * FROM users WHERE id = $1", [userId]);
    return user;
  }, { ttl: 60000 }); // Cache for 60 seconds
}

await getUser(1); // Hits database
await getUser(1); // Returns from cache
await getUser(2); // Hits database again
```

### API Response Caching

```typescript
app.get("/api/posts", async (req, res) => {
  const posts = await cache.wrap("posts:all", 
    () => fetchPostsFromAPI(),
    { ttl: 300000 } // 5 minutes
  );
  res.json(posts);
});
```

### Session Management

```typescript
// Store session with auto-expiration
await cache.set("session:abc123", userData, { ttl: 3600000 }); // 1 hour

// Session automatically disappears after 1 hour
const session = await cache.get("session:abc123");
if (!session) {
  // User logged out or session expired
}
```

## Choosing Your Backend

### In-Memory (Default)

```typescript
const cache = new Cache(); // Uses memory by default
```

**Advantages:** Development environments, single-server deployments, rapid prototyping  
**Trade-offs:** Data is lost on restart, doesn't scale across multiple instances

### Redis (Distributed)

```typescript
import { RedisProvider } from "cachkit";

const redis = new RedisProvider();
await redis.connect();

const cache = new Cache(redis);
```

**Advantages:** Multi-instance deployments, persistent storage, production-ready  
**Trade-offs:** Requires Redis server to be running

### Memcached (Distributed)

```typescript
import { MemcachedProvider } from "cachkit";

const memcached = new MemcachedProvider({
  hosts: ["localhost:11211"],
  keyPrefix: "app:"
});
await memcached.connect();

const cache = new Cache(memcached);
```

**Advantages:** High-performance distributed caching  
**Trade-offs:** Requires Memcached server, data is not persistent

## API

### `cache.get(key)`
Retrieve a cached value. Returns `undefined` if not found or expired.

### `cache.set(key, value, options)`
Store a value with optional TTL (time-to-live in milliseconds).

### `cache.delete(key)`
Remove a key from cache immediately.

### `cache.clear()`
Remove all keys from cache. Use when you need a complete cache flush.

### `cache.has(key)`
Check if key exists and isn't expired.

### `cache.keys()`
List all cache keys.

### `cache.wrap(key, fn, options)`
The magic method. Memoizes expensive operations:
- If cached → returns instantly
- If cache miss → executes `fn`, stores result, returns it

Works with both sync and async functions.

## Understanding Cache Behavior

The `cache.wrap()` method is the core of Cachkit. Here's how it works:

```typescript
const user = await cache.wrap("user:123", () => fetchFromDB(123));
// First call: Function executes, result is cached
const user2 = await cache.wrap("user:123", () => fetchFromDB(123));
// Second call: Result is returned from cache instantly, function never executes
```

You can customize behavior with TTL, encryption, and invalidation:
- **Expire data** with TTL (time-to-live)
- **Invalidate manually** using `delete()`
- **Switch backends** without changing application code

## Performance

Real-world benchmarks (Node.js 20+):

| Operation | Time | Notes |
|-----------|------|-------|
| Get (cached) | ~0.1ms | Instant memory lookup |
| Get (Redis) | ~2ms | Network roundtrip |
| Wrap (hit) | ~0.2ms | Zero function execution |
| Wrap (miss) | ~5ms | Includes execution time |

**Impact:** Database query taking 100ms? Cache it, get 0.1ms instant repeat hits. 1000x faster.

## Advanced Usage

### Namespace Separation

```typescript
const userCache = new Cache(provider, "users");
const postCache = new Cache(provider, "posts");

userCache.set("1", userData);   // Stored as "users:1"
postCache.set("1", postData);   // Stored as "posts:1"

// Keys don't collide even with identical identifiers
```

### Strategic Cache Invalidation

```typescript
async function updateUser(userId, data) {
  await database.update("users", data, { id: userId });
  
  // Invalidate all caches related to this user
  await cache.delete(`user:${userId}`);
}
```

### Multi-Level Cache Clearing

```typescript
// User data changed - clear all related caches
const keys = await cache.keys();
for (const key of keys.filter(k => k.startsWith("user:123"))) {
  await cache.delete(key);
}
```

## Error Handling

All operations fail gracefully. Errors are logged but **never thrown**:

```typescript
// Even if something explodes internally
const value = await cache.get("key");
// Won't crash. Returns undefined if something went wrong.
```

This is intentional. Caching failures shouldn't break your app.

## 🔒 Security

## Security

### Input Validation

All cache keys are validated to prevent injection attacks:

```typescript
import { validateKey, sanitizeKey } from "cachkit";

const result = validateKey("user:123:profile");
if (!result.valid) {
  console.error(result.error);
}

// Auto-sanitize keys
const safe = sanitizeKey("User-123@Profile"); // → "user-123_profile"
```

### Encryption at Rest

Protect sensitive data in cache using AES-256-GCM encryption:

```typescript
import { generateEncryptionKey } from "cachkit";

const key = generateEncryptionKey(); // Store in .env, not in code
const encrypted = await cache.set("api_token", sensitiveData, {
  encrypted: true,
  encryptionKey: key
});
```

### Rate Limiting

Prevent cache abuse with rate limiting:

```typescript
import { RateLimiter } from "cachkit";

const limiter = new RateLimiter(10000, 60000); // 10,000 ops per 60 seconds

if (!limiter.isAllowed("user:123")) {
  throw new Error("Rate limit exceeded");
}
```

For comprehensive security best practices, see: [Security Guide](./SECURITY.md)

## Monitoring & Metrics

Track cache performance and health in real-time:

```typescript
import { MetricsCollector, HealthMonitor } from "cachkit";

const metrics = new MetricsCollector();
const monitor = new HealthMonitor(metrics);

// Record operations
metrics.recordHit(0.5);  // Record 0.5ms cache hit
metrics.recordMiss(10);  // Record 10ms cache miss

// Get performance snapshot
console.log(metrics.getMetrics());
// {
//   hits: 100,
//   misses: 25,
//   hitRate: 80%,
//   avgResponseTime: 1.2ms,
//   errorRate: 0.01%,
//   ...
// }

// Check cache health
const health = monitor.check();
// { status: "healthy", hitRate: 80, avgResponseTime: 1.2, ... }
```

**See:** [Performance Tuning Guide](./PERFORMANCE.md)

## Testing

```bash
npm test
```

Cachkit includes 157 tests covering:
- Concurrent operations and race conditions
- TTL expiration and LRU eviction
- Error handling and graceful failures
- Security features (injection prevention, encryption, rate limiting)
- Monitoring and metrics collection
- High-load stress testing (1000+ concurrent operations)
- Real-world usage patterns and integration scenarios

## Contributing

Contributions are welcome. Before submitting a pull request:

```bash
npm run build    # Compile TypeScript
npm test         # Run all tests (157 tests)
npm run typecheck # Verify type safety
npm run lint:fix # Fix linting issues
```

All tests must pass before PR review. For new features, please include appropriate test coverage.

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)

## Why Cachkit Exists

Every Node.js application implements caching differently. Some use `redis.get()`, others build custom LRU implementations, and most scatter TTL logic throughout the codebase. We wanted a single, reliable library that:

- Works without configuration hassles
- Supports both in-memory and distributed caching
- Handles memoization automatically
- Fails gracefully instead of crashing your app
- Gets out of your way

Cachkit is built with TypeScript, extensively tested (157 tests), and maintains a stable API. Use it in development with in-memory storage or promote to production with Redis—the same code works everywhere.

## License

MIT License. See LICENSE file for details.

## Frequently Asked Questions

**Q: Will Cachkit replace my Redis setup?**  
A: No. Use in-memory mode for development and single-instance deployments. Use Redis for production systems with multiple instances.

**Q: How does this compare to other caching libraries?**  
A: Cachkit is smaller, faster, offers superior async support, and works with Redis without additional setup.

**Q: What if I don't want automatic expiration?**  
A: Don't set a TTL. Data persists until you manually delete it or the cache reaches capacity and evicts entries via LRU.

**Q: Is this production-ready?**  
A: Yes. Cachkit includes 157 passing tests, full TypeScript support, and is actively used in production services.

**Q: How do I debug cache operations?**  
A: Set `LOG_LEVEL=debug` before running. Cachkit will log all operations for inspection.

---

**Made by developers, for developers. Stop reinventing the cache.**
