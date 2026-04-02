import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Cache } from "../lib/cache.js";
import { MemoryProvider } from "../lib/providers/index.js";

describe("Cache - Serialization & Data Integrity", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(new MemoryProvider(), "serialization");
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe("data integrity", () => {
    it("should preserve object structure after retrieval", async () => {
      const obj = { a: 1, b: { c: 2 } };
      await cache.set("obj", obj);
      const retrieved = await cache.get("obj");

      expect(retrieved).toEqual(obj);
      // Note: After serialization, structure is preserved but identity may differ
    });

    it("should handle complex nested structures", async () => {
      const complex = {
        users: [
          { id: 1, name: "Alice", tags: ["admin", "user"] },
          { id: 2, name: "Bob", tags: ["user"] },
        ],
        metadata: {
          version: "1.0",
          features: {
            caching: true,
            compression: true,
            encryption: false,
          },
        },
        timestamps: {
          created: Date.now(),
          updated: Date.now(),
        },
      };

      await cache.set("complex", complex);
      const retrieved = await cache.get("complex");

      expect(retrieved).toEqual(complex);
      expect(retrieved.users[0].tags[0]).toEqual("admin");
      expect(retrieved.metadata.features.compression).toBe(true);
    });

    it("should preserve array order", async () => {
      const arr = [5, 3, 8, 1, 9, 2];
      await cache.set("arr", arr);
      const retrieved = await cache.get("arr");

      expect(retrieved).toEqual(arr);
      for (let i = 0; i < arr.length; i++) {
        expect(retrieved[i]).toEqual(arr[i]);
      }
    });

    it("should handle objects with many properties", async () => {
      const obj: any = {};
      for (let i = 0; i < 1000; i++) {
        obj[`prop_${i}`] = Math.random();
      }

      await cache.set("many-props", obj);
      const retrieved = await cache.get("many-props");

      expect(Object.keys(retrieved).length).toEqual(1000);
      for (let i = 0; i < 1000; i++) {
        expect(retrieved[`prop_${i}`]).toEqual(obj[`prop_${i}`]);
      }
    });

    it("should preserve unicode strings", async () => {
      const unicode = {
        chinese: "你好世界",
        arabic: "مرحبا بالعالم",
        hebrew: "שלום עולם",
        emoji: "👋🌍🎉",
        mixed: "Hello 世界 مرحبا 🚀",
      };

      await cache.set("unicode", unicode);
      const retrieved = await cache.get("unicode");

      expect(retrieved).toEqual(unicode);
      expect(retrieved.emoji).toEqual("👋🌍🎉");
    });

    it("should handle very long strings", async () => {
      const longStr = "a".repeat(100000);
      await cache.set("long", longStr);
      const retrieved = await cache.get("long");

      expect(retrieved).toEqual(longStr);
      expect(retrieved.length).toBe(100000);
    });

    it("should handle strings with special characters", async () => {
      const special = 'test\n\r\t\\"quoted\\"\\backslash\\';
      await cache.set("special", special);
      const retrieved = await cache.get("special");

      expect(retrieved).toEqual(special);
    });
  });

  describe("type preservation", () => {
    it("should preserve number types (int, float, special values)", async () => {
      const numbers = {
        int: 42,
        negative: -100,
        float: 3.14159,
        zero: 0,
        large: 9007199254740991, // MAX_SAFE_INTEGER
      };

      await cache.set("numbers", numbers);
      const retrieved = await cache.get("numbers");

      expect(retrieved.int).toBe(42);
      expect(retrieved.float).toBeCloseTo(3.14159);
      expect(retrieved.zero).toBe(0);
      expect(retrieved.large).toBe(9007199254740991);
    });

    it("should preserve boolean types", async () => {
      const bools = { t: true, f: false };
      await cache.set("bools", bools);
      const retrieved = await cache.get("bools");

      expect(retrieved.t).toBe(true);
      expect(retrieved.f).toBe(false);
      expect(typeof retrieved.t).toBe("boolean");
      expect(typeof retrieved.f).toBe("boolean");
    });

    it("should preserve null and undefined", async () => {
      const values = {
        nullVal: null,
        undefinedVal: undefined,
        nested: {
          nullInside: null,
          undefinedInside: undefined,
        },
      };

      await cache.set("nullish", values);
      const retrieved = await cache.get("nullish");

      expect(retrieved.nullVal).toBeNull();
      expect(retrieved.undefinedVal).toBeUndefined();
      expect(retrieved.nested.nullInside).toBeNull();
      expect(retrieved.nested.undefinedInside).toBeUndefined();
    });

    it("should preserve Date objects", async () => {
      const date = new Date("2024-01-15T10:30:00Z");
      await cache.set("date", date);
      const retrieved = await cache.get("date");

      expect(retrieved).toEqual(date);
      expect(retrieved.getTime()).toEqual(date.getTime());
    });

    it("should preserve array types", async () => {
      const data = {
        emptyArray: [],
        typedArray: new Uint8Array([1, 2, 3]),
        nestedArray: [[1, 2], [3, 4]],
      };

      await cache.set("arrays", data);
      const retrieved = await cache.get("arrays");

      expect(Array.isArray(retrieved.emptyArray)).toBe(true);
      expect(retrieved.emptyArray.length).toBe(0);
      expect(Array.isArray(retrieved.nestedArray)).toBe(true);
    });
  });

  describe("edge case serialization", () => {
    it("should handle objects with getter properties", async () => {
      const obj = {
        a: 1,
        get b() {
          return 2;
        },
      };

      await cache.set("getter", obj);
      const retrieved = await cache.get("getter");

      // Getters won't be preserved, but basic properties should be
      expect(retrieved.a).toBe(1);
    });

    it("should handle objects with null prototype", async () => {
      const obj = Object.create(null);
      obj.a = 1;
      obj.b = 2;

      await cache.set("null-proto", obj);
      const retrieved = await cache.get("null-proto");

      expect(retrieved.a).toBe(1);
      expect(retrieved.b).toBe(2);
    });

    it("should handle sparse arrays correctly", async () => {
      const sparse: any[] = [];
      sparse[0] = "first";
      sparse[5] = "sixth";
      sparse[10] = "eleventh";

      await cache.set("sparse", sparse);
      const retrieved = await cache.get("sparse");

      expect(retrieved[0]).toEqual("first");
      expect(retrieved[5]).toEqual("sixth");
      expect(retrieved[10]).toEqual("eleventh");
    });

    it("should handle objects with numeric string keys", async () => {
      const obj = {
        "1": "one",
        "2": "two",
        "10": "ten",
        a: "letter",
      };

      await cache.set("numeric-keys", obj);
      const retrieved = await cache.get("numeric-keys");

      expect(retrieved["1"]).toEqual("one");
      expect(retrieved["10"]).toEqual("ten");
      expect(retrieved.a).toEqual("letter");
    });

    it("should handle objects with Symbol-like properties", async () => {
      const obj = {
        regularKey: "value",
        _privateKey: "private",
        __dunder: "dunder",
      };

      await cache.set("symbol-like", obj);
      const retrieved = await cache.get("symbol-like");

      expect(retrieved.regularKey).toEqual("value");
      expect(retrieved._privateKey).toEqual("private");
      expect(retrieved.__dunder).toEqual("dunder");
    });

    it("should handle mixed array and object structures", async () => {
      const mixed = [
        { id: 1, items: [1, 2, 3] },
        { id: 2, items: [4, 5, 6] },
      ];

      await cache.set("mixed", mixed);
      const retrieved = await cache.get("mixed");

      expect(retrieved[0].id).toEqual(1);
      expect(retrieved[0].items[1]).toEqual(2);
      expect(retrieved[1].items[2]).toEqual(6);
    });

    it("should handle repeated references in object graph", async () => {
      const shared = { shared: true };
      const obj = {
        ref1: shared,
        ref2: shared,
      };

      await cache.set("refs", obj);
      const retrieved = await cache.get("refs");

      expect(retrieved.ref1).toEqual(shared);
      expect(retrieved.ref2).toEqual(shared);
      // Note: refs may not be identical after serialization
    });
  });

  describe("multiple sets and overwrites", () => {
    it("should handle overwriting with different types", async () => {
      const key = "overwrite";

      await cache.set(key, "string");
      expect(await cache.get(key)).toEqual("string");

      await cache.set(key, 123);
      expect(await cache.get(key)).toEqual(123);

      await cache.set(key, { obj: true });
      expect(await cache.get(key)).toEqual({ obj: true });

      await cache.set(key, [1, 2, 3]);
      expect(await cache.get(key)).toEqual([1, 2, 3]);

      await cache.set(key, null);
      expect(await cache.get(key)).toBeNull();
    });

    it("should handle multiple overwrites on same key rapidly", async () => {
      const key = "rapid";

      const promises = Array.from({ length: 100 }, (_, i) =>
        cache.set(key, { iteration: i, data: "x".repeat(100) })
      );

      await Promise.all(promises);

      const final = await cache.get(key);
      expect(final.iteration).toBeLessThan(100);
      expect(final.iteration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("cache consistency", () => {
    it("should return consistent results on repeated gets", async () => {
      const obj = { id: 1, name: "test", nested: { value: 123 } };
      await cache.set("consistent", obj);

      const get1 = await cache.get("consistent");
      const get2 = await cache.get("consistent");
      const get3 = await cache.get("consistent");

      expect(get1).toEqual(get2);
      expect(get2).toEqual(get3);
    });

    it("should not corrupt data through multiple operations", async () => {
      const original = {
        id: 1,
        items: [
          { name: "item1", tags: ["a", "b"] },
          { name: "item2", tags: ["c", "d"] },
        ],
      };

      await cache.set("data", original);

      // Perform multiple operations
      expect(await cache.has("data")).toBe(true);
      expect(await cache.get("data")).toEqual(original);
      expect(await cache.has("data")).toBe(true);
      expect(await cache.get("data")).toEqual(original);

      // Data should still be intact
      const final = await cache.get("data");
      expect(final.items[0].tags[1]).toEqual("b");
    });
  });
});
