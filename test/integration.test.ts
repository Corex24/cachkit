import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Cache } from "../lib/cache.js";
import { MemoryProvider } from "../lib/providers/index.js";

describe("Cache - Integration Tests (Real-World Scenarios)", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(new MemoryProvider({ maxSize: 1000 }), "integration");
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe("real-world usage patterns", () => {
    it("should work as a database query cache", async () => {
      let queryCount = 0;

      const queryDatabase = async (userId: string) => {
        queryCount++;
        return { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` };
      };

      // First access - cache miss
      const user1 = await cache.wrap(`user:${1}`, () => queryDatabase("1"), {
        ttl: 60000,
      });
      expect(user1.name).toEqual("User 1");
      expect(queryCount).toBe(1);

      // Second access - cache hit
      const user1Again = await cache.wrap(`user:${1}`, () => queryDatabase("1"), {
        ttl: 60000,
      });
      expect(user1Again.name).toEqual("User 1");
      expect(queryCount).toBe(1); // Still 1

      // Different user - cache miss
      const user2 = await cache.wrap(`user:${2}`, () => queryDatabase("2"), {
        ttl: 60000,
      });
      expect(user2.name).toEqual("User 2");
      expect(queryCount).toBe(2);
    });

    it("should work as API response cache", async () => {
      const mockApiCall = async (endpoint: string) => {
        return {
          endpoint,
          data: [1, 2, 3],
          timestamp: Date.now(),
        };
      };

      const cacheKey = "api:/posts";
      const response1 = await cache.wrap(cacheKey, () => mockApiCall("/posts"), {
        ttl: 30000,
      });

      const response2 = await cache.wrap(cacheKey, () => mockApiCall("/posts"), {
        ttl: 30000,
      });

      expect(response1.timestamp).toEqual(response2.timestamp); // From cache
    });

    it("should work as computation cache", async () => {
      let computations = 0;

      const expensiveComputation = async (n: number) => {
        computations++;
        let result = 0;
        for (let i = 0; i < n; i++) {
          result += i;
        }
        return result;
      };

      const compute = (n: number) =>
        cache.wrap(`compute:${n}`, () => expensiveComputation(n), {
          ttl: 5000,
        });

      const r1 = await compute(1000);
      const r2 = await compute(1000);
      const r3 = await compute(2000);

      expect(r1).toEqual(r2);
      expect(computations).toBe(2); // Only run twice (different inputs)
    });

    it("should handle cache invalidation patterns", async () => {
      const userId = 123;
      const cacheKey = `user:${userId}`;

      // Set user data
      await cache.set(cacheKey, {
        id: userId,
        name: "John",
        email: "john@example.com",
      });

      // Verify it's cached
      expect(await cache.has(cacheKey)).toBe(true);

      // User updates profile
      // Invalidate cache
      await cache.delete(cacheKey);
      expect(await cache.has(cacheKey)).toBe(false);

      // Next access will fetch fresh data
    });

    it("should handle session-like caching with TTL", async () => {
      jest.useFakeTimers();

      const sessionId = "session-abc123";
      const sessionData = { userId: 1, roles: ["user"], loginTime: Date.now() };

      // Store session with 1 hour TTL
      await cache.set(sessionId, sessionData, { ttl: 3600000 });

      // Should exist immediately
      expect(await cache.get(sessionId)).toEqual(sessionData);

      // Advance time by 30 minutes
      jest.advanceTimersByTime(1800000);
      expect(await cache.get(sessionId)).toEqual(sessionData); // Still there

      // Advance time by another 31 minutes (past TTL)
      jest.advanceTimersByTime(1860000);
      expect(await cache.get(sessionId)).toBeUndefined(); // Expired

      jest.useRealTimers();
    });

    it("should handle multi-level cache namespacing", async () => {
      const userCache = new Cache(new MemoryProvider(), "users");
      const postCache = new Cache(new MemoryProvider(), "posts");

      await userCache.set("1", { name: "Alice" });
      await postCache.set("1", { title: "First Post" });

      expect(await userCache.get("1")).toEqual({ name: "Alice" });
      expect(await postCache.get("1")).toEqual({ title: "First Post" });

      // Keys are isolated
      const userKeys = await userCache.keys();
      const postKeys = await postCache.keys();

      expect(userKeys).toEqual(["1"]);
      expect(postKeys).toEqual(["1"]);
    });

    it("should handle rate limiting use case", async () => {
      const userId = "user:123";
      const rateKey = `ratelimit:${userId}`;

      // Track API calls
      let callCount = 0;

      // Simulate 10 calls
      for (let i = 0; i < 10; i++) {
        const current = (await cache.get(rateKey)) || 0;
        callCount = current + 1;
        await cache.set(rateKey, callCount, { ttl: 60000 });
      }

      const finalCount = await cache.get(rateKey);
      expect(finalCount).toEqual(10);

      // Could check if finalCount > limit to reject
      if (finalCount > 100) {
        // Would reject request
      }
    });

    it("should handle cascading invalidation", async () => {
      // User profile
      await cache.set("user:1", { name: "John", updated: 1 });
      // User settings
      await cache.set("user:1:settings", { theme: "dark" });
      // User preferences
      await cache.set("user:1:preferences", { notifications: true });

      // Delete all user-related cache
      const allKeys = await cache.keys();
      const userKeys = allKeys.filter((k) => k.startsWith("user:1"));

      for (const key of userKeys) {
        await cache.delete(key);
      }

      // Verify all deleted
      expect(await cache.has("user:1")).toBe(false);
      expect(await cache.has("user:1:settings")).toBe(false);
      expect(await cache.has("user:1:preferences")).toBe(false);
    });

    it("should handle bulk operations", async () => {
      const users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];

      // Cache all users
      const promises = users.map((user) =>
        cache.set(`user:${user.id}`, user)
      );
      await Promise.all(promises);

      // Fetch all users
      const fetched = await Promise.all(
        users.map((user) => cache.get(`user:${user.id}`))
      );

      expect(fetched).toEqual(users);
    });

    it("should handle conditional caching", async () => {
      const fetchData = async (shouldCache: boolean) => {
        const data = { value: Math.random() };

        if (shouldCache) {
          await cache.set("data", data, { ttl: 10000 });
        }

        return data;
      };

      const data1 = await fetchData(true);
      const data2 = await fetchData(false);

      // First was cached, so should be identicalafter retrieval
      const cached = await cache.get("data");
      expect(cached).toEqual(data1);
    });

    it("should handle dependency tracking with cache keys", async () => {
      const userId = 1;
      const postId = 100;

      // Cache post data with reference to user
      const postData = {
        id: postId,
        title: "My Post",
        authorId: userId,
        content: "Content here",
      };

      await cache.set(`post:${postId}`, postData);
      await cache.set(`user:${userId}:posts`, [postId]);

      // Invalidate post affects user's post list
      if ((await cache.get(`post:${postId}`)) !== undefined) {
        // Could invalidate related caches
        await cache.delete(`user:${userId}:posts`);
      }

      expect(await cache.get(`user:${userId}:posts`)).toBeUndefined();
    });
  });

  describe("robustness scenarios", () => {
    it("should handle cache thrashing", async () => {
      // Rapidly create and destroy cache entries
      for (let i = 0; i < 1000; i++) {
        await cache.set(`key-${i}`, { data: i });
        if (i % 2 === 0) {
          await cache.delete(`key-${i}`);
        }
      }

      const remaining = await cache.keys();
      expect(remaining.length).toBeGreaterThan(0);
      expect(remaining.length).toBeLessThan(1000);
    });

    it("should handle clear between intensive operations", async () => {
      // Fill cache
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, i);
      }

      // Clear
      await cache.clear();
      expect((await cache.keys()).length).toBe(0);

      // Fill again
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, i * 2);
      }

      // Verify new values
      expect(await cache.get("key-0")).toEqual(0);
      expect(await cache.get("key-50")).toEqual(100);
    });

    it("should handle mixed read/write/delete patterns", async () => {
      const operations = [];

      for (let cycle = 0; cycle < 10; cycle++) {
        // Write
        operations.push(cache.set(`w-${cycle}`, cycle));
        // Read
        operations.push(cache.get(`w-${cycle}`));
        // Check
        operations.push(cache.has(`w-${cycle}`));
        // Delete
        operations.push(cache.delete(`w-${cycle}`));
        // Check again
        operations.push(cache.has(`w-${cycle}`));
      }

      await Promise.all(operations);
      expect((await cache.keys()).length).toBe(0);
    });
  });
});
