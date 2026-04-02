export { Cache } from "./cache.js";
export { MemoryProvider, RedisProvider, MemcachedProvider } from "./providers/index.js";
export type {
  CacheOptions,
  WrapOptions,
  ProviderOptions,
  CacheProvider,
  SerializableValue,
} from "./types/index.js";

// Security features
export {
  validateKey,
  validateTTL,
  validateValueSize,
  sanitizeKey,
  validatePaginationParams,
  encrypt,
  decrypt,
  generateEncryptionKey,
  RateLimiter,
  createRateLimiter,
} from "./security/index.js";
export type {
  ValidationOptions,
  EncryptionConfig,
  EncryptedValue,
  RateLimitConfig,
  RateLimitState,
} from "./security/index.js";

// Monitoring features
export {
  MetricsCollector,
  HealthMonitor,
} from "./monitoring/index.js";
export type {
  CacheMetrics,
  OperationMetrics,
  HealthStatus,
} from "./monitoring/index.js";