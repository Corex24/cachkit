import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Cache } from "../lib/cache.js";
import { MemoryProvider } from "../lib/providers/index.js";

describe("Cache", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(new MemoryProvider(), "test");
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe("get/set operations", () => {
    it("should set and get a value", async () => {
      const key = "user:1";
      const value = { id: 1, name: "John" };

      await cache.set(key, value);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it("should return undefined for non-existent key", async () => {
      const result = await cache.get("non-existent");
      expect(result).toBeUndefined();
    });

    it("should handle multiple types of values", async () => {
      const testCases = [
        ["string", "hello world"],
        ["number", 42],
        ["boolean", true],
        ["array", [1, 2, 3]],
        ["object", { a: 1, b: 2 }],
      ];

      for (const [key, value] of testCases) {
        await cache.set(key as string, value);
        const result = await cache.get(key as string);
        expect(result).toEqual(value);
      }
    });

    it("should overwrite existing values", async () => {
      const key = "counter";
      await cache.set(key, 1);
      await cache.set(key, 2);

      const result = await cache.get(key);
      expect(result).toEqual(2);
    });
  });

  describe("delete operations", () => {
    it("should delete a key", async () => {
      const key = "temp:data";
      await cache.set(key, "value");
      expect(await cache.has(key)).toBe(true);

      await cache.delete(key);
      expect(await cache.has(key)).toBe(false);
    });

    it("should not error when deleting non-existent key", async () => {
      await expect(cache.delete("non-existent")).resolves.toBeUndefined();
    });
  });

  describe("clear operations", () => {
    it("should clear all cache entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      await cache.clear();

      expect(await cache.get("key1")).toBeUndefined();
      expect(await cache.get("key2")).toBeUndefined();
      expect(await cache.get("key3")).toBeUndefined();
    });
  });

  describe("has operations", () => {
    it("should check if key exists", async () => {
      const key = "check:me";
      expect(await cache.has(key)).toBe(false);

      await cache.set(key, "exists");
      expect(await cache.has(key)).toBe(true);
    });
  });

  describe("keys operations", () => {
    it("should list all cache keys", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      const keys = await cache.keys();
      expect(keys.sort()).toEqual(["key1", "key2", "key3"]);
    });

    it("should return empty array when cache is empty", async () => {
      const keys = await cache.keys();
      expect(keys).toEqual([]);
    });
  });

  describe("wrap operations", () => {
    it("should cache function result", async () => {
      const fn = jest.fn(async () => "result");

      const result1 = await cache.wrap("func:1", fn);
      const result2 = await cache.wrap("func:1", fn);

      expect(result1).toEqual("result");
      expect(result2).toEqual("result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should support synchronous functions", async () => {
      const fn = jest.fn(() => "sync result");

      const result = await cache.wrap("sync:func", fn);
      expect(result).toEqual("sync result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should return cached result on subsequent calls", async () => {
      const fn = jest.fn(async () => ({ expensive: "data" }));

      await cache.wrap("expensive:op", fn);
      await cache.wrap("expensive:op", fn);
      await cache.wrap("expensive:op", fn);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should support TTL option", async () => {
      jest.useFakeTimers();
      const fn = jest.fn(async () => "data");

      await cache.wrap("ttl:key", fn, { ttl: 5000 });
      jest.advanceTimersByTime(6000);
      await cache.wrap("ttl:key", fn);

      expect(fn).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });

  describe("TTL support", () => {
    it("should expire values after TTL", async () => {
      jest.useFakeTimers();

      await cache.set("expiring", "value", { ttl: 5000 });
      expect(await cache.get("expiring")).toEqual("value");

      jest.advanceTimersByTime(6000);
      expect(await cache.get("expiring")).toBeUndefined();

      jest.useRealTimers();
    });

    it("should not expire values without TTL", async () => {
      jest.useFakeTimers();

      await cache.set("persistent", "value");
      jest.advanceTimersByTime(10000);

      expect(await cache.get("persistent")).toEqual("value");
      jest.useRealTimers();
    });
  });

  describe("edge cases", () => {
    it("should handle complex nested objects", async () => {
      const complex = {
        user: {
          id: 1,
          profile: {
            name: "John",
            settings: {
              notifications: true,
            },
          },
        },
      };

      await cache.set("complex", complex);
      const result = await cache.get("complex");
      expect(result).toEqual(complex);
    });

    it("should handle large arrays", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }));

      await cache.set("large", largeArray);
      const result = await cache.get("large");
      expect(result).toHaveLength(1000);
      expect(result?.[0]).toEqual({ id: 0, value: "item-0" });
    });

    it("should handle keys with special characters", async () => {
      const specialKeys = [
        "user:1:profile",
        "cache.namespace.key",
        "key-with-dashes",
        "key_with_underscores",
      ];

      for (const key of specialKeys) {
        await cache.set(key, `value-${key}`);
        const result = await cache.get(key);
        expect(result).toEqual(`value-${key}`);
      }
    });

    it("should handle empty string values", async () => {
      await cache.set("empty", "");
      const result = await cache.get("empty");
      expect(result).toEqual("");
    });

    it("should handle zero values", async () => {
      await cache.set("zero", 0);
      const result = await cache.get("zero");
      expect(result).toEqual(0);
    });
  });
});
