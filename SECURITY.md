# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in cachkit, please **do not** open a public GitHub issue. Instead, please email corexanthony24@gmail.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested patches

We take all security reports seriously and will respond within 48 hours.

## Security Features

### Input Validation

All cache keys are validated to prevent injection attacks:
- **Max length:** 512 characters (configurable)
- **Allowed characters:** `[a-z0-9:_-]` (alphanumeric, colon, underscore, hyphen)
- **Rejection patterns:** SQL injection, command injection, protocol injection

```typescript
import { validateKey } from "cachkit";

const result = validateKey("user:123:profile");
if (!result.valid) {
  console.error(result.error);
}
```

### TTL Validation

TTL (time-to-live) values are strictly validated:
- **Minimum:** 0ms (no expiration)
- **Maximum:** 31,536,000,000ms (1 year)
- **Non-numeric values rejected**

Prevents integer overflow and resource exhaustion attacks.

```typescript
import { validateTTL } from "cachkit";

const result = validateTTL(60000); // 60 seconds
if (!result.valid) {
  console.error("Invalid TTL");
}
```

### Value Size Validation

Cached values are validated to prevent DoS attacks:
- **Default max:** 104,857,600 bytes (~100MB)
- **Configurable per operation**
- **Non-serializable values rejected**

```typescript
import { validateValueSize } from "cachkit";

const result = validateValueSize(largeObject, { 
  maxValueSize: 10_000_000 // 10MB max 
});
```

### Encryption at Rest

Optional AES-256-GCM encryption for sensitive cached values:

```typescript
import { Cache, generateEncryptionKey } from "cachkit";

const encryptionKey = generateEncryptionKey(); // Store in env var
const cache = new Cache();

// Enable encryption
const encrypted = await cache.set("api_token", "secret", {
  ttl: 3600000,
  encrypted: true,
  encryptionKey
});
```

**Note:** Encryption key must be 32 bytes (64 hex characters).

### Rate Limiting

Prevent cache abuse with configurable rate limiting:

```typescript
import { RateLimiter } from "cachkit";

const limiter = new RateLimiter(
  10000,  // Max 10,000 requests
  60000   // Per 60 seconds
);

if (!limiter.isAllowed("user:123")) {
  throw new Error("Rate limit exceeded");
}
```

## Best Practices

### 1. Key Naming

Use namespaced, descriptive keys:

```typescript
// Good
"user:123:sessions"
"post:456:draft"
"cache:db_query:posts_v2"

// Avoid
"u123"
"4 5 6"
"key"
```

### 2. TTL Strategy

Always set appropriate TTLs to prevent stale data:

```typescript
// Database queries: 5 minutes
await cache.wrap("user:123", () => fetchUser(123), { ttl: 300000 });

// API responses: 1 minute
await cache.wrap("posts:all", () => fetchAllPosts(), { ttl: 60000 });

// Session data: 1 hour
await cache.set("session:abc123", userSession, { ttl: 3600000 });
```

### 3. Sensitive Data

For PII or tokens, use encryption:

```typescript
import { encrypt, decrypt, generateEncryptionKey } from "cachkit";

const key = generateEncryptionKey();
const encrypted = encrypt(JSON.stringify(userData), key);
await cache.set("user_data:123", encrypted);

// On retrieval
const retrieved = await cache.get("user_data:123");
const decrypted = decrypt(retrieved, key);
```

### 4. Error Handling

Cache failures should not crash applications:

```typescript
const result = await cache.get("key");

if (!result) {
  // Cache miss or error occurred gracefully
  // Fetch from source instead
  const data = await fetchFromDatabase();
  await cache.set("key", data);
  return data;
}

return result;
```

### 5. Monitoring

Enable metrics to detect anomalies:

```typescript
import { MetricsCollector, HealthMonitor } from "cachkit";

const metrics = new MetricsCollector();
const monitor = new HealthMonitor(metrics);

// Log health every minute
setInterval(() => {
  const health = monitor.check();
  console.log(`Cache health: ${health.status}`, {
    hitRate: health.hitRate,
    errorRate: health.errorRate
  });
}, 60000);
```

## Redis Security

If using Redis, follow these practices:

```typescript
import { RedisProvider } from "cachkit";

const redis = new RedisProvider({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD, // Use AUTH
  retryStrategy: () => null, // Don't retry on error
  enableReadyCheck: true,
  enableOfflineQueue: false,
});

// Always authenticate
await redis.connect();
```

**Important:**
- Always use AUTH/password in production
- Use TLS connections when possible
- Restrict Redis to private networks only
- Implement rate limiting on a per-user basis
- Monitor Redis memory usage

## Dependencies

Cachkit depends on:
- `lru-cache` - Memory provider (vetted & maintained)
- `ioredis` - Redis client (widely used, well-maintained)
- `msgpack-lite` - Serialization (minimal dependency footprint)
- `pino` - Logging (minimal overhead)

All dependencies are regularly audited. Run:

```bash
npm audit
npm audit fix
```

## Version Support

Cachkit is supported on:
- **Node.js:** 20.0.0+ (ESM required)
- **TypeScript:** 5.0+ (full type safety)

## Changelog

For security fixes, see:
https://github.com/Corex24/cachkit/releases

## License

MIT License - See LICENSE file
