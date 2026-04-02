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
export declare class MetricsCollector {
    private hits;
    private misses;
    private sets;
    private deletes;
    private errors;
    private operationTimes;
    private lastUpdated;
    private maxHistorySize;
    recordHit(duration?: number): void;
    recordMiss(duration?: number): void;
    recordSet(duration?: number): void;
    recordDelete(duration?: number): void;
    recordError(): void;
    private recordOperationTime;
    getMetrics(): CacheMetrics;
    getPercentileResponseTime(percentile?: number): number;
    reset(): void;
    toJSON(): CacheMetrics;
}
export interface HealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    errorRate: number;
    hitRate: number;
    avgResponseTime: number;
    lastCheck: number;
}
export declare class HealthMonitor {
    private metrics;
    private errorThreshold;
    private hitRateThreshold;
    private responseTimeThreshold;
    constructor(metrics: MetricsCollector);
    /**
     * @function check
     * @description Performs health check and returns status based on configured thresholds
     * @returns {HealthStatus} Current health status with metrics
     */
    check(): HealthStatus;
    setErrorThreshold(threshold: number): void;
    setHitRateThreshold(threshold: number): void;
    setResponseTimeThreshold(ms: number): void;
}
