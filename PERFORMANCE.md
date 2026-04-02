# Performance Guide

## Benchmarks

Cachkit delivers exceptional performance out of the box. Here are real-world benchmarks on Node.js 20:

| Operation | Time | Notes |
|-----------|------|-------|
| `Get (hit)` | ~0.1ms | In-memory lookup |
| `Get (miss)` | ~0.05ms | Cache lookup + miss detection |
| `Set` | ~0.2ms | In-memory store |
| `Wrap (hit)` | ~0.2ms | Function not called |
| `Wrap (miss)` | ~5-50ms | Function execution + store |
| `Delete` | ~0.05ms | Key removal |
| `Clear` | ~1ms | Full cache clear |

## Memory Provider Performance

### LRU Eviction

Memory cache uses LRU (Least Recently Used) eviction with O(1) operations:

```typescript
const cache = new Cache(); // Default: 500 items max

// Performance profile:
// - Get: O(1) constant time
// - Set: O(1) constant time
// - Delete: O(1) constant time
// - Memory: ~1KB per cached item (approximate)
```

### Configuration for Memory

Adjust `maxSize` based on your needs:

```typescript
import { MemoryProvider } from "cachkit";

const memory = new MemoryProvider({
  maxSize: 1000 // Increase for more items
});

const cache = new Cache(memory);
```

**Memory estimates:**
- 500 items (default): ~500KB overhead
- 1000 items: ~1MB overhead
- 10,000 items: ~10MB overhead

## Redis Provider Performance

### Network Latency

Redis adds network round-trip latency:

```
Local Redis:   ~2-5ms per operation
Remote Redis:  ~20-100ms+ depending on network
```

### Connection Pooling

Cachkit automatically manages Redis connections:

```typescript
import { RedisProvider } from "cachkit";

const redis = new RedisProvider({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: 3, // Retry strategy
  enableReadyCheck: true,   // Wait for ready state
});

await redis.connect();
```

### Redis Commands Used

Cachkit uses efficient Redis commands:

- `GET key` - O(1)
- `SET key value EX ttl` - O(1)
- `DEL key` - O(1)
- `EXISTS key` - O(1)
- `FLUSHDB` - O(N) where N = number of keys

## Optimization Strategies

### 1. Key Prefixing

Use namespaces to organize and batch operations:

```typescript
const userCache = new Cache(provider, "users");  // "users:123"
const postCache = new Cache(provider, "posts");  // "posts:456"
```

**Benefit:** Logical separation, easy bulk invalidation

### 2. TTL Tuning

Set appropriate TTLs for cache effectiveness:

```typescript
// Hot data (changes frequently): 1-5 minutes
await cache.wrap("trending_posts", fetchTrending, { ttl: 60000 });

// Warm data (changes occasionally): 10-30 minutes
await cache.wrap("user:123", fetchUser, { ttl: 600000 });

// Cold data (rarely changes): 1-24 hours
await cache.wrap("categories", fetchCategories, { ttl: 86400000 });
```

### 3. Batch Operations

Cache multiple related items together:

```typescript
// Instead of:
const user = await cache.wrap("user:123", () => fetchUser(123));
const posts = await cache.wrap("posts:user:123", () => fetchUserPosts(123));

// Better:
const userData = await cache.wrap("user_data:123", async () => {
  const [user, posts] = await Promise.all([
    fetchUser(123),
    fetchUserPosts(123)
  ]);
  return { user, posts };
}, { ttl: 300000 });

const { user, posts } = userData;
```

**Benefit:** Fewer cache lookups, better hit rate

### 4. Memoization Patterns

Use `wrap()` for expensive operations:

```typescript
// Database queries
const user = await cache.wrap(
  `db:user:${userId}`,
  () => database.users.findById(userId),
  { ttl: 600000 }
);

// API calls
const weather = await cache.wrap(
  `api:weather:${city}`,
  () => fetchWeatherAPI(city),
  { ttl: 3600000 }
);

// Computations
const stats = await cache.wrap(
  `computed:stats:${month}`,
  () => calculateMonthlyStats(month),
  { ttl: 86400000 }
);
```

### 5. Cache Invalidation

Invalidate strategically, not globally:

```typescript
// Bad: Invalidate entire cache
await cache.clear();

// Better: Invalidate specific keys
await cache.delete(`user:${userId}`);
await cache.delete(`posts:user:${userId}`);

// Best: Namespace clearing
const keys = await cache.keys();
const userKeys = keys.filter(k => k.startsWith("user:"));
await Promise.all(userKeys.map(k => cache.delete(k)));
```

### 6. Concurrent Load Handling

Use rate limiting for high-traffic scenarios:

```typescript
import { RateLimiter } from "cachkit";

const limiter = new RateLimiter(10000, 60000); // 10k requests/min

if (!limiter.isAllowed("cache_operations")) {
  throw new Error("Rate limit exceeded");
}

await cache.set(key, value);
```

## Monitoring Performance

### Metrics Collection

Track cache performance in production:

```typescript
import { MetricsCollector, HealthMonitor } from "cachkit";

const metrics = new MetricsCollector();
const monitor = new HealthMonitor(metrics);

// Periodically log metrics
setInterval(() => {
  const m = metrics.getMetrics();
  const health = monitor.check();
  
  console.log({
    "Cache Health": health.status,
    "Hit Rate": `${m.hitRate}%`,
    "Avg Response": `${m.avgResponseTime}ms`,
    "Error Rate": `${(m.errors / (m.hits + m.misses + m.errors) * 100).toFixed(2)}%`
  });
}, 60000);

// Instrument cache operations
const start = Date.now();
const user = await cache.get("user:123");
metrics.recordHit(Date.now() - start);
```

### Health Endpoints

Expose metrics for monitoring systems:

```typescript
import express from "express";
import { MetricsCollector, HealthMonitor } from "cachkit";

const app = express();
const metrics = new MetricsCollector();
const monitor = new HealthMonitor(metrics);

app.get("/health/cache", (req, res) => {
  const health = monitor.check();
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});

app.get("/metrics/cache", (req, res) => {
  res.json(metrics.getMetrics());
});
```

## Troubleshooting Performance

### High Cache Misses

**Symptoms:** Hit rate < 50%

**Solutions:**
1. Increase TTL for cache entries
2. Reduce `maxSize` to prevent eviction
3. Use better key naming for consistency
4. Monitor for cache invalidation patterns

```typescript
const metrics = metrics.getMetrics();
console.log(`Hit rate: ${metrics.hitRate}%`); // < 50% = investigate
```

### Memory Pressure

**Symptoms:** Process memory grows continuously

**Solutions:**
1. Reduce cache size
2. Decrease TTL values
3. Enable compression for large values
4. Use Redis instead of memory

```typescript
import { MemoryProvider } from "cachkit";

const memory = new MemoryProvider({ maxSize: 100 }); // Smaller cache
const cache = new Cache(memory);
```

### Redis Latency

**Symptoms:** Operations taking 50-100ms+

**Solutions:**
1. Use local/nearby Redis instance
2. Enable pipelining (automatic in ioredis)
3. Reduce network hops
4. Use Redis Cluster for scale

```typescript
import { RedisProvider } from "cachkit";

const redis = new RedisProvider({
  host: "localhost",      // Local if possible
  port: 6379,
  enableKeepAlive: true,  // Connection keep-alive
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});
```

## Production Checklist

- [ ] Set appropriate TTLs for each cache layer
- [ ] Monitor cache hit rate (target: > 70%)
- [ ] Set up health check endpoints
- [ ] Enable metrics collection
- [ ] Configure rate limiting if needed
- [ ] Use Redis for multi-instance deployments
- [ ] Set up alerts for degraded cache health
- [ ] Document cache invalidation strategy
- [ ] Implement cache warming on startup
- [ ] Regular audit of cache memory usage

---

**For more details, see:** [SECURITY.md](./SECURITY.md)
