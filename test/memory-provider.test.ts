import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { MemoryProvider } from "../lib/providers/index.js";

describe("MemoryProvider", () => {
  let provider: MemoryProvider;

  beforeEach(() => {
    provider = new MemoryProvider({ maxSize: 100 });
  });

  afterEach(async () => {
    await provider.clear();
  });

  describe("basic operations", () => {
    it("should get and set values", async () => {
      await provider.set("key1", "value1");
      const result = await provider.get("key1");
      expect(result).toEqual("value1");
    });

    it("should delete values", async () => {
      await provider.set("key1", "value1");
      await provider.delete("key1");
      const result = await provider.get("key1");
      expect(result).toBeUndefined();
    });

    it("should check key existence", async () => {
      expect(await provider.has("key1")).toBe(false);
      await provider.set("key1", "value1");
      expect(await provider.has("key1")).toBe(true);
    });

    it("should clear all values", async () => {
      await provider.set("key1", "value1");
      await provider.set("key2", "value2");
      await provider.clear();

      expect(await provider.get("key1")).toBeUndefined();
      expect(await provider.get("key2")).toBeUndefined();
    });

    it("should list all keys", async () => {
      await provider.set("key1", "value1");
      await provider.set("key2", "value2");
      const keys = await provider.keys();
      expect(keys.sort()).toEqual(["key1", "key2"]);
    });
  });

  describe("TTL support", () => {
    it("should expire values after TTL", async () => {
      jest.useFakeTimers();

      await provider.set("key1", "value", 5000);
      expect(await provider.get("key1")).toEqual("value");

      jest.advanceTimersByTime(6000);
      expect(await provider.get("key1")).toBeUndefined();

      jest.useRealTimers();
    });

    it("should not expire values without TTL", async () => {
      jest.useFakeTimers();

      await provider.set("key1", "value");
      jest.advanceTimersByTime(10000);

      expect(await provider.get("key1")).toEqual("value");
      jest.useRealTimers();
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used items when max size exceeded", async () => {
      const smallProvider = new MemoryProvider({ maxSize: 3 });

      await smallProvider.set("key1", "value1");
      await smallProvider.set("key2", "value2");
      await smallProvider.set("key3", "value3");
      await smallProvider.set("key4", "value4");

      // key1 should be evicted as it's the least recently used
      expect(await smallProvider.get("key1")).toBeUndefined();
      expect(await smallProvider.get("key4")).toEqual("value4");
    });
  });

  describe("types and serialization", () => {
    it("should handle complex objects", async () => {
      const obj = { a: 1, b: { c: 2 } };
      await provider.set("obj", obj);
      const result = await provider.get("obj");
      expect(result).toEqual(obj);
    });

    it("should handle arrays", async () => {
      const arr = [1, 2, 3, 4, 5];
      await provider.set("arr", arr);
      const result = await provider.get("arr");
      expect(result).toEqual(arr);
    });

    it("should handle primitives", async () => {
      const values = ["string", 123, true, null];
      for (let i = 0; i < values.length; i++) {
        await provider.set(`key${i}`, values[i]);
        const result = await provider.get(`key${i}`);
        expect(result).toEqual(values[i]);
      }
    });
  });
});
