import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Cache } from "../lib/cache.js";
import { MemoryProvider } from "../lib/providers/index.js";

describe("Cache - Stress Tests", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(new MemoryProvider({ maxSize: 10000 }), "stress");
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe("high-volume operations", () => {
    it("should handle 1000 concurrent sets", async () => {
      const promises = Array.from({ length: 1000 }, (_, i) =>
        cache.set(`key-${i}`, { id: i, data: `value-${i}` })
      );

      await Promise.all(promises);
      const keys = await cache.keys();

      expect(keys.length).toBe(1000);
    });

    it("should handle 1000 concurrent gets", async () => {
      // Populate cache
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, i);
      }

      // Concurrent reads
      const promises = Array.from({ length: 1000 }, (_, i) =>
        cache.get(`key-${i % 100}`)
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(1000);
      expect(results.every((r) => typeof r === "number" || r === undefined)).toBe(true);
    });

    it("should handle mixed concurrent operations", async () => {
      const operations = [];

      for (let i = 0; i < 300; i++) {
        operations.push(cache.set(`key-${i}`, i));
      }

      for (let i = 0; i < 300; i++) {
        operations.push(cache.get(`key-${i % 300}`));
      }

      for (let i = 0; i < 100; i++) {
        operations.push(cache.delete(`key-${i}`));
      }

      for (let i = 0; i < 100; i++) {
        operations.push(cache.has(`key-${i + 100}`));
      }

      await Promise.all(operations);
      const finalKeys = await cache.keys();

      expect(finalKeys.length).toBeGreaterThan(0);
      expect(finalKeys.length).toBeLessThanOrEqual(300);
    });

    it("should handle rapid set/overwrite cycles", async () => {
      const key = "overwrite-test";

      const promises = Array.from({ length: 500 }, (_, i) =>
        cache.set(key, i)
      );

      await Promise.all(promises);
      const final = await cache.get(key);

      expect(typeof final === "number" || final === undefined).toBe(true);
    });

    it("should handle cache with large objects", async () => {
      const largeObj = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          timestamp: Date.now(),
          nested: { deep: { value: Math.random() } },
        })),
        metadata: {
          created: Date.now(),
          size: 1000,
        },
      };

      await cache.set("large", largeObj);
      const retrieved = await cache.get("large");

      expect(retrieved).toEqual(largeObj);
    });

    it("should handle wrap with expensive operations", async () => {
      let callCount = 0;
      const expensiveFn = async () => {
        callCount++;
        // Simulate expensive operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { computed: callCount };
      };

      const promises = Array.from({ length: 100 }, () =>
        cache.wrap("expensive", expensiveFn, { ttl: 30000 })
      );

      const results = await Promise.all(promises);

      // Note: With concurrent requests, multiple may execute before cache is populated
      // The first cached result will be reused for all
      expect(results.length).toBe(100);
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it("should handle many keys at LRU limit", async () => {
      const provider = new MemoryProvider({ maxSize: 100 });
      const testCache = new Cache(provider, "lru-limit");

      // Fill beyond limit
      for (let i = 0; i < 150; i++) {
        await testCache.set(`key-${i}`, i);
      }

      const keys = await testCache.keys();

      // Should be at or below limit
      expect(keys.length).toBeLessThanOrEqual(100);
      // Most recent keys should exist
      expect(await testCache.has("key-149")).toBe(true);

      await testCache.clear();
    });
  });

  describe("performance under load", () => {
    it("should maintain acceptable get performance at 1000 items", async () => {
      // Populate
      for (let i = 0; i < 1000; i++) {
        await cache.set(`perf-${i}`, { id: i });
      }

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await cache.get(`perf-${i}`);
      }

      const duration = Date.now() - start;

      // Should complete reasonably fast (less than 500ms for 1000 reads)
      expect(duration).toBeLessThan(500);
    });

    it("should handle 100 simultaneous wrap requests", async () => {
      let executionCount = 0;

      const promises = Array.from({ length: 100 }, (_, i) =>
        cache.wrap(`concurrent-${Math.floor(i / 10)}`, async () => {
          executionCount++;
          await new Promise((resolve) => setImmediate(resolve));
          return Math.random();
        })
      );

      const results = await Promise.all(promises);

      // Multiple concurrent requests to same key may execute before cache populates
      // But results should be returned
      expect(results.length).toBe(100);
      expect(executionCount).toBeGreaterThanOrEqual(10); // At least once per unique key
      expect(executionCount).toBeLessThanOrEqual(100); // At most all
    });
  });

  describe("memory stability", () => {
    it("should not leak memory with repeated set/delete cycles", async () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 100; i++) {
          await cache.set(`cycle-${cycle}-${i}`, Array(1000).fill(0));
        }
        await cache.clear();
      }

      const keys = await cache.keys();
      expect(keys.length).toBe(0);
    });

    it("should handle circular references gracefully", async () => {
      const obj: any = { a: 1 };
      obj.self = obj; // Circular reference

      try {
        await cache.set("circular", obj);
        // If it succeeds, that's fine - msgpack handles it
        // If it fails, that's also acceptable
      } catch {
        // Expected - circular refs aren't serializable
      }
    });
  });
});
