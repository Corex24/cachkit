import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Cache } from "../lib/cache.js";
import { MemoryProvider } from "../lib/providers/index.js";

describe("Cache - Error Handling & Stability", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(new MemoryProvider(), "error-test");
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe("graceful error handling", () => {
    it("should handle get on non-existent key gracefully", async () => {
      const result = await cache.get("non-existent-key-xyz");
      expect(result).toBeUndefined();
    });

    it("should handle delete on non-existent key gracefully", async () => {
      await expect(cache.delete("non-existent")).resolves.not.toThrow();
    });

    it("should handle wrap with sync function that throws", async () => {
      const errorFn = () => {
        throw new Error("Sync function error");
      };

      await expect(
        cache.wrap("error-sync", errorFn)
      ).rejects.toThrow("Sync function error");
    });

    it("should handle wrap with async function that throws", async () => {
      const errorFn = async () => {
        throw new Error("Async function error");
      };

      await expect(
        cache.wrap("error-async", errorFn)
      ).rejects.toThrow("Async function error");
    });

    it("should recover after wrap error on retry", async () => {
      let shouldFail = true;
      const flakeyFn = async () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("First call fails");
        }
        return "success";
      };

      // First call fails
      await expect(
        cache.wrap("flakey", flakeyFn, { ttl: 500 })
      ).rejects.toThrow();

      // Second call should succeed (not cached because first failed)
      const result = await cache.wrap("flakey", flakeyFn);
      expect(result).toEqual("success");
    });

    it("should handle setters with null values", async () => {
      await expect(cache.set("null-key", null)).resolves.not.toThrow();
      const result = await cache.get("null-key");
      expect(result).toBeNull();
    });

    it("should handle setters with undefined values", async () => {
      await expect(cache.set("undef-key", undefined)).resolves.not.toThrow();
      const result = await cache.get("undef-key");
      expect(result).toBeUndefined();
    });

    it("should handle keys() operation gracefully", async () => {
      const keys = await cache.keys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(0);
    });

    it("should handle clear() operation gracefully", async () => {
      await cache.set("key1", "value1");
      await expect(cache.clear()).resolves.not.toThrow();

      const keys = await cache.keys();
      expect(keys.length).toBe(0);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle empty string key", async () => {
      await cache.set("", "value");
      const result = await cache.get("");
      expect(result).toEqual("value");
    });

    it("should handle very long keys", async () => {
      const longKey = "k".repeat(10000);
      await cache.set(longKey, "value");
      const result = await cache.get(longKey);
      expect(result).toEqual("value");
    });

    it("should handle special characters in keys", async () => {
      const specialKeys = [
        "key/with/slashes",
        "key:with:colons",
        "key.with.dots",
        "key-with-dashes",
        "key_with_underscores",
        "key with spaces",
        "键名中文",
        "مفتاح",
        "🔑emoji",
      ];

      for (const key of specialKeys) {
        await cache.set(key, `value-${key}`);
        const result = await cache.get(key);
        expect(result).toEqual(`value-${key}`);
      }
    });

    it("should handle extremely large values", async () => {
      const largeValue = "x".repeat(1000000); // 1MB string
      await cache.set("large", largeValue);
      const result = await cache.get("large");
      expect(result).toEqual(largeValue);
    });

    it("should handle deeply nested objects", async () => {
      const createNested = (depth: number): any => {
        if (depth === 0) return "leaf";
        return { nested: createNested(depth - 1) };
      };

      const deepObj = createNested(100);
      await cache.set("deep", deepObj);
      const result = await cache.get("deep");
      expect(result).toEqual(deepObj);
    });

    it("should handle arrays with mixed types", async () => {
      const mixed = [
        1,
        "string",
        true,
        null,
        undefined,
        { obj: 1 },
        [1, 2, 3],
        Date.now(),
      ];

      await cache.set("mixed", mixed);
      const result = await cache.get("mixed");
      expect(result).toEqual(mixed);
    });

    it("should handle Date objects", async () => {
      const now = new Date();
      await cache.set("date", now);
      const result = await cache.get("date");
      expect(result).toEqual(now);
    });

    it("should handle boolean edge cases", async () => {
      await cache.set("true", true);
      await cache.set("false", false);

      expect(await cache.get("true")).toEqual(true);
      expect(await cache.get("false")).toEqual(false);
    });

    it("should handle numeric edge cases", async () => {
      const numbers = [0, -0, 1, -1, 0.5, -0.5, Infinity, -Infinity, NaN];

      for (let i = 0; i < numbers.length; i++) {
        const key = `num-${i}`;
        await cache.set(key, numbers[i]);
        const result = await cache.get(key);

        if (Number.isNaN(numbers[i])) {
          expect(Number.isNaN(result)).toBe(true);
        } else {
          expect(result).toEqual(numbers[i]);
        }
      }
    });
  });

  describe("concurrent operations safety", () => {
    it("should handle concurrent set and delete on same key", async () => {
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(cache.set("key", i));
        operations.push(cache.delete("key"));
      }

      await Promise.all(operations);

      // Should end in a consistent state
      const final = await cache.get("key");
      expect(final === undefined || typeof final === "number").toBe(true);
    });

    it("should handle concurrent operations on different keys", async () => {
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(cache.set(`key-${i}`, i));
        operations.push(cache.get(`key-${i}`));
        operations.push(cache.has(`key-${i}`));
      }

      await Promise.all(operations);
      const keys = await cache.keys();
      expect(keys.length).toBe(100);
    });

    it("should handle concurrent has and delete", async () => {
      for (let i = 0; i < 50; i++) {
        await cache.set(`key-${i}`, i);
      }

      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(cache.has(`key-${i}`));
        operations.push(cache.delete(`key-${i}`));
      }

      await Promise.all(operations);
      const keys = await cache.keys();
      expect(keys.length).toBeLessThanOrEqual(50);
    });

    it("should handle concurrent keys() and clear()", async () => {
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, i);
      }

      const promises = [
        ...Array.from({ length: 10 }, () => cache.keys()),
        cache.clear(),
      ];

      await Promise.all(promises);

      const finalKeys = await cache.keys();
      expect(finalKeys.length).toBe(0);
    });
  });

  describe("operation chaining", () => {
    it("should handle rapid set/get/delete sequence", async () => {
      const key = "sequence";

      await cache.set(key, "value1");
      expect(await cache.get(key)).toEqual("value1");

      await cache.set(key, "value2");
      expect(await cache.get(key)).toEqual("value2");

      await cache.delete(key);
      expect(await cache.get(key)).toBeUndefined();

      await cache.set(key, "value3");
      expect(await cache.get(key)).toEqual("value3");
    });

    it("should handle wrap with automatic cache updates", async () => {
      let value = 1;
      const fn = () => value++;

      const result1 = await cache.wrap("increment", fn);
      expect(result1).toEqual(1);

      const result2 = await cache.wrap("increment", fn);
      expect(result2).toEqual(1); // Cached

      await cache.delete("increment");

      const result3 = await cache.wrap("increment", fn);
      expect(result3).toEqual(2); // Re-executed
    });
  });

  describe("state consistency", () => {
    it("should maintain consistent state after operations", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      expect(await cache.get("key1")).toEqual("value1");
      expect(await cache.get("key2")).toEqual("value2");
      expect(await cache.get("key3")).toEqual("value3");

      await cache.delete("key2");

      expect(await cache.get("key1")).toEqual("value1");
      expect(await cache.get("key2")).toBeUndefined();
      expect(await cache.get("key3")).toEqual("value3");

      const keys = await cache.keys();
      expect(keys.sort()).toEqual(["key1", "key3"]);
    });

    it("should have correct key count", async () => {
      const N = 50;

      for (let i = 0; i < N; i++) {
        await cache.set(`key-${i}`, i);
      }

      let keys = await cache.keys();
      expect(keys.length).toEqual(N);

      for (let i = 0; i < N / 2; i++) {
        await cache.delete(`key-${i}`);
      }

      keys = await cache.keys();
      expect(keys.length).toEqual(N / 2);
    });
  });
});
