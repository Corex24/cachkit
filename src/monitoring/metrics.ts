// Monitoring and metrics collection
// Tracks cache performance so you know if things are running smoothly

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgResponseTime: number;
  lastUpdated: number;
}

export interface OperationMetrics {
  operationType: "get" | "set" | "delete" | "wrap" | "clear";
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

// MetricsCollector - gathers stats about cache operations
// Useful for debugging, performance monitoring, and alerting
export class MetricsCollector {
  private hits: number = 0;
  private misses: number = 0;
  private sets: number = 0;
  private deletes: number = 0;
  private errors: number = 0;
  private operationTimes: number[] = [];
  private lastUpdated: number = Date.now();
  private maxHistorySize: number = 10000;

  // Record a cache hit with how long it took
  recordHit(duration: number = 0): void {
    this.hits++;
    this.recordOperationTime(duration);
  }

  // Record a cache miss with how long it took
  recordMiss(duration: number = 0): void {
    this.misses++;
    this.recordOperationTime(duration);
  }

  // Record a cache set operation
  recordSet(duration: number = 0): void {
    this.sets++;
    this.recordOperationTime(duration);
  }

  // Record a cache delete operation
  recordDelete(duration: number = 0): void {
    this.deletes++;
    this.recordOperationTime(duration);
  }

  // Record when something goes wrong
  recordError(): void {
    this.errors++;
  }

  // Internally track operation times for analytics
  // We keep a rolling window to avoid using unlimited memory
  private recordOperationTime(duration: number): void {
    this.operationTimes.push(duration);
    this.lastUpdated = Date.now();

    // Prevent unbounded memory growth
    if (this.operationTimes.length > this.maxHistorySize) {
      this.operationTimes = this.operationTimes.slice(-this.maxHistorySize);
    }
  }

  // Get a snapshot of current metrics
  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    const avgResponseTime =
      this.operationTimes.length > 0
        ? this.operationTimes.reduce((a, b) => a + b, 0) /
          this.operationTimes.length
        : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      errors: this.errors,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      lastUpdated: this.lastUpdated,
    };
  }

  // Calculate response time at a specific percentile (useful for performance monitoring)
  getPercentileResponseTime(percentile: number = 95): number {
    if (this.operationTimes.length === 0) return 0;

    const sorted = [...this.operationTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  // Clear all collected metrics (start fresh)
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.errors = 0;
    this.operationTimes = [];
    this.lastUpdated = Date.now();
  }

  // Export metrics as JSON (useful for APIs or monitoring systems)
  toJSON(): CacheMetrics {
    return this.getMetrics();
  }
}

// The status summary of your cache - everything OK? degraded? or totally broken?
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  errorRate: number;
  hitRate: number;
  avgResponseTime: number;
  lastCheck: number;
}

// HealthMonitor - watches your cache and tells you if it's running well
export class HealthMonitor {
  private metrics: MetricsCollector;
  private errorThreshold: number = 0.1; // 10% error rate
  private hitRateThreshold: number = 0.5; // 50% hit rate
  private responseTimeThreshold: number = 1000; // 1 second in ms

  constructor(metrics: MetricsCollector) {
    this.metrics = metrics;
  }

  /**
   * @function check
   * @description Performs health check and returns status based on configured thresholds
   * @returns {HealthStatus} Current health status with metrics
   */
  check(): HealthStatus {
    const m = this.metrics.getMetrics();

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    const errorRate = (m.errors / (m.hits + m.misses + m.errors)) || 0;

    if (errorRate > this.errorThreshold) {
      status = "unhealthy";
    } else if (m.hitRate < this.hitRateThreshold || m.avgResponseTime > this.responseTimeThreshold) {
      status = "degraded";
    }

    return {
      status,
      errorRate: Math.round(errorRate * 10000) / 100,
      hitRate: m.hitRate,
      avgResponseTime: m.avgResponseTime,
      lastCheck: Date.now(),
    };
  }

  // Adjust when we consider error rates to be "unhealthy"
  setErrorThreshold(threshold: number): void {
    this.errorThreshold = threshold;
  }

  // Adjust when we consider cache hit rates to be "degraded"
  setHitRateThreshold(threshold: number): void {
    this.hitRateThreshold = threshold;
  }

  // Adjust when we consider response times to be "degraded"
  setResponseTimeThreshold(ms: number): void {
    this.responseTimeThreshold = ms;
  }
}
