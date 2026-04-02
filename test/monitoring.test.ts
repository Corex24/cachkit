/**
 * Monitoring and metrics tests
 * Validates metrics collection, health checks, and monitoring capabilities
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import {
  MetricsCollector,
  HealthMonitor,
} from "../lib/monitoring/index.js";

describe("Monitoring: Metrics Collection", () => {
  it("should initialize with zero metrics", () => {
    const collector = new MetricsCollector();
    const metrics = collector.getMetrics();

    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });

  it("should record cache hits and misses", () => {
    const collector = new MetricsCollector();
    collector.recordHit(1.5);
    collector.recordMiss(5.0);

    const metrics = collector.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(metrics.hitRate).toBe(50);
  });

  it("should calculate average response time", () => {
    const collector = new MetricsCollector();
    collector.recordHit(10);
    collector.recordHit(20);
    collector.recordHit(30);

    const metrics = collector.getMetrics();
    expect(metrics.avgResponseTime).toBe(20);
  });

  it("should reset all metrics", () => {
    const collector = new MetricsCollector();
    collector.recordHit();
    collector.recordSet();
    collector.reset();

    const metrics = collector.getMetrics();
    expect(metrics.hits).toBe(0);
    expect(metrics.sets).toBe(0);
  });

  it("should calculate percentile response time", () => {
    const collector = new MetricsCollector();
    for (let i = 1; i <= 100; i++) {
      collector.recordHit(i);
    }

    const p95 = collector.getPercentileResponseTime(95);
    expect(p95).toBeGreaterThan(90);
  });
});

describe("Monitoring: Health Check", () => {
  it("should report health status", () => {
    const collector = new MetricsCollector();
    const monitor = new HealthMonitor(collector);

    for (let i = 0; i < 100; i++) {
      collector.recordHit(2);
    }

    const health = monitor.check();
    expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    expect(health.hitRate).toBe(100);
  });

  it("should allow configuring thresholds", () => {
    const collector = new MetricsCollector();
    const monitor = new HealthMonitor(collector);

    monitor.setErrorThreshold(0.2);
    monitor.setHitRateThreshold(0.7);
    monitor.setResponseTimeThreshold(100);

    const health = monitor.check();
    expect(typeof health.status).toBe("string");
  });

  it("should report error rate", () => {
    const collector = new MetricsCollector();
    const monitor = new HealthMonitor(collector);

    for (let i = 0; i < 100; i++) {
      collector.recordHit();
    }
    for (let i = 0; i < 5; i++) {
      collector.recordError();
    }

    const health = monitor.check();
    expect(health.errorRate).toBeGreaterThan(0);
  });
});

describe("Monitoring: Performance Analysis", () => {
  it("should track metrics under load", () => {
    const collector = new MetricsCollector();

    for (let i = 0; i < 800; i++) {
      collector.recordHit(Math.random() * 5);
    }
    for (let i = 0; i < 200; i++) {
      collector.recordMiss(Math.random() * 20);
    }

    const metrics = collector.getMetrics();

    expect(metrics.hits).toBe(800);
    expect(metrics.misses).toBe(200);
    expect(metrics.hitRate).toBe(80);
  });

  it("should handle mixed operation types", () => {
    const collector = new MetricsCollector();

    for (let i = 0; i < 50; i++) {
      collector.recordHit(2);
      collector.recordMiss(8);
      collector.recordSet(3);
      collector.recordDelete(1);
    }

    const metrics = collector.getMetrics();

    expect(metrics.hits).toBe(50);
    expect(metrics.misses).toBe(50);
    expect(metrics.sets).toBe(50);
    expect(metrics.deletes).toBe(50);
  });
});
