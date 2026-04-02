/**
 * Security tests - injection attacks, validation, encryption
 * Tests for preventing common attack vectors
 */

import { describe, it, expect } from "@jest/globals";
import {
  validateKey,
  validateTTL,
  validateValueSize,
  sanitizeKey,
  encrypt,
  decrypt,
  generateEncryptionKey,
  RateLimiter,
} from "../lib/security/index.js";

describe("Security: Input Validation", () => {
  it("should reject empty keys", () => {
    const result = validateKey("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("should reject non-string keys", () => {
    const result = validateKey(123 as any);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("string");
  });

  it("should reject keys exceeding max length", () => {
    const longKey = "a".repeat(1000);
    const result = validateKey(longKey, { maxKeyLength: 512 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds");
  });

  it("should reject keys with invalid characters (SQL injection attempt)", () => {
    const sqlInjection = "key'; DROP TABLE cache; --";
    const result = validateKey(sqlInjection);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("invalid characters");
  });

  it("should reject keys with command injection attempts", () => {
    const cmdInjection = "key`rm -rf /`";
    const result = validateKey(cmdInjection);
    expect(result.valid).toBe(false);
  });

  it("should reject keys with protocol injection attempts", () => {
    const protocolInjection = "http://evil.com/key";
    const result = validateKey(protocolInjection);
    expect(result.valid).toBe(false);
  });

  it("should accept valid keys with allowed characters", () => {
    const validKey = "user:123:profile:v2";
    const result = validateKey(validKey);
    expect(result.valid).toBe(true);
  });

  it("should accept keys with underscores and hyphens", () => {
    const result = validateKey("cache_key-123");
    expect(result.valid).toBe(true);
  });
});

describe("Security: TTL Validation", () => {
  it("should reject negative TTL", () => {
    const result = validateTTL(-1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("negative");
  });

  it("should reject TTL exceeding 1 year", () => {
    const maxTTLPlus = 365 * 24 * 60 * 60 * 1000 + 1;
    const result = validateTTL(maxTTLPlus);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceed");
  });

  it("should accept valid TTL values", () => {
    const result = validateTTL(60000);
    expect(result.valid).toBe(true);
    expect(result.ttl).toBe(60000);
  });

  it("should accept undefined TTL (no expiration)", () => {
    const result = validateTTL(undefined);
    expect(result.valid).toBe(true);
    expect(result.ttl).toBeUndefined();
  });

  it("should reject non-numeric TTL", () => {
    const result = validateTTL("60000" as any);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("number");
  });
});

describe("Security: Value Size Validation", () => {
  it("should reject values exceeding max size", () => {
    const largeValue = "x".repeat(104857601); // ~100MB + 1 byte
    const result = validateValueSize(largeValue, {
      maxValueSize: 104857600,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds");
  });

  it("should accept values within size limits", () => {
    const value = { data: "test", nested: { field: 123 } };
    const result = validateValueSize(value);
    expect(result.valid).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  });

  it("should reject non-serializable values", () => {
    const circular: any = { ref: null };
    circular.ref = circular;
    const result = validateValueSize(circular);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("serializable");
  });

  it("should handle binary data correctly", () => {
    const buffer = Buffer.from("binary data");
    const result = validateValueSize(buffer);
    expect(result.valid).toBe(true);
  });
});

describe("Security: Key Sanitization", () => {
  it("should convert keys to lowercase", () => {
    const result = sanitizeKey("CamelCaseKey");
    expect(result).toBe("camelcasekey");
  });

  it("should remove invalid characters", () => {
    const result = sanitizeKey("key!@#$%^&*()|\\");
    expect(result).toMatch(/^[a-z0-9:_-]+$/);
  });

  it("should trim whitespace", () => {
    const result = sanitizeKey("  key with spaces  ");
    expect(result).toBe("key_with_spaces");
  });

  it("should handle SQL injection attempts", () => {
    const result = sanitizeKey("'; DROP TABLE cache; --");
    expect(result).not.toContain("'");
    expect(result).not.toContain(";");
  });
});

describe("Security: Encryption (AES-256-GCM)", () => {
  let encryptionKey: string;

  beforeAll(() => {
    encryptionKey = generateEncryptionKey();
  });

  it("should generate valid encryption keys", () => {
    const key = generateEncryptionKey();
    expect(typeof key).toBe("string");
    expect(key).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(/^[a-f0-9]{64}$/.test(key)).toBe(true);
  });

  it("should encrypt and decrypt values correctly", () => {
    const original = "sensitive data";
    const encrypted = encrypt(original, encryptionKey);

    expect(encrypted.encrypted).toBe(true);
    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.data).not.toBe(original);

    const decrypted = decrypt(encrypted, encryptionKey);
    expect(decrypted).toBe(original);
  });

  it("should produce different ciphertext each time (random IV)", () => {
    const value = "test";
    const encrypted1 = encrypt(value, encryptionKey);
    const encrypted2 = encrypt(value, encryptionKey);

    expect(encrypted1.data).not.toBe(encrypted2.data);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it("should fail decryption with wrong key", () => {
    const value = "secret";
    const encrypted = encrypt(value, encryptionKey);
    const wrongKey = generateEncryptionKey();

    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("should fail decryption with tampered data", () => {
    const value = "secret";
    const encrypted = encrypt(value, encryptionKey);

    // Tamper with the ciphertext
    const tampered = {
      ...encrypted,
      data: encrypted.data.slice(0, -2) + "XX",
    };

    expect(() => decrypt(tampered, encryptionKey)).toThrow();
  });

  it("should handle special characters in encrypted values", () => {
    const special = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
    const encrypted = encrypt(special, encryptionKey);
    const decrypted = decrypt(encrypted, encryptionKey);
    expect(decrypted).toBe(special);
  });

  it("should handle JSON objects in encrypted values", () => {
    const obj = { user: "admin", role: "superuser", token: "secret" };
    const jsonStr = JSON.stringify(obj);
    const encrypted = encrypt(jsonStr, encryptionKey);
    const decrypted = decrypt(encrypted, encryptionKey);
    expect(JSON.parse(decrypted)).toEqual(obj);
  });
});

describe("Security: Rate Limiting", () => {
  it("should initialize with default limits", () => {
    const limiter = new RateLimiter();
    expect(limiter.getRemaining()).toBe(10000);
  });

  it("should allow requests within window", () => {
    const limiter = new RateLimiter(5, 1000);
    expect(limiter.isAllowed("user1")).toBe(true);
    expect(limiter.isAllowed("user1")).toBe(true);
    expect(limiter.isAllowed("user1")).toBe(true);
  });

  it("should reject requests exceeding limit", () => {
    const limiter = new RateLimiter(3, 1000);
    limiter.isAllowed("user2");
    limiter.isAllowed("user2");
    limiter.isAllowed("user2");

    expect(limiter.isAllowed("user2")).toBe(false);
    expect(limiter.isAllowed("user2")).toBe(false);
  });

  it("should track remaining requests", () => {
    const limiter = new RateLimiter(10, 1000);
    expect(limiter.getRemaining("user3")).toBe(10);

    limiter.isAllowed("user3");
    expect(limiter.getRemaining("user3")).toBe(9);

    limiter.isAllowed("user3");
    expect(limiter.getRemaining("user3")).toBe(8);
  });

  it("should reset window after TTL expires", (done) => {
    const limiter = new RateLimiter(2, 100);

    expect(limiter.isAllowed("user4")).toBe(true);
    expect(limiter.isAllowed("user4")).toBe(true);
    expect(limiter.isAllowed("user4")).toBe(false);

    setTimeout(() => {
      expect(limiter.isAllowed("user4")).toBe(true);
      done();
    }, 150);
  });

  it("should isolate limits between different identifiers", () => {
    const limiter = new RateLimiter(2, 1000);

    expect(limiter.isAllowed("user5a")).toBe(true);
    expect(limiter.isAllowed("user5a")).toBe(true);
    expect(limiter.isAllowed("user5a")).toBe(false);

    expect(limiter.isAllowed("user5b")).toBe(true);
    expect(limiter.isAllowed("user5b")).toBe(true);
    expect(limiter.isAllowed("user5b")).toBe(false);
  });

  it("should provide reset time estimate", () => {
    const limiter = new RateLimiter(5, 1000);
    limiter.isAllowed("user6");

    const resetTime = limiter.getResetTime("user6");
    expect(resetTime).toBeGreaterThan(0);
    expect(resetTime).toBeLessThanOrEqual(1000);
  });

  it("should cleanup old rate limit windows", () => {
    const limiter = new RateLimiter(5, 100);

    limiter.isAllowed("temp1");
    limiter.isAllowed("temp2");

    // Force cleanup of expired windows
    const cleaned = limiter.cleanup();
    expect(typeof cleaned).toBe("number");
  });
});

describe("Security: Preventing Common Attacks", () => {
  it("should prevent NoSQL injection", () => {
    const evilKey = 'key"; DELETE FROM cache; {"a":"a';
    const result = validateKey(evilKey);
    expect(result.valid).toBe(false);
  });

  it("should prevent XSS via keys", () => {
    const xssKey = '<script>alert("XSS")</script>';
    const result = validateKey(xssKey);
    expect(result.valid).toBe(false);
  });

  it("should prevent Directory Traversal", () => {
    const traversal = "../../etc/passwd";
    const result = validateKey(traversal);
    expect(result.valid).toBe(false);
  });

  it("should prevent Null Byte injection", () => {
    const nullByte = "key\x00extra";
    // Should be caught by regex validation
    const result = validateKey(nullByte);
    expect(result.valid).toBe(false);
  });

  it("should enforce maximum value size to prevent DoS", () => {
    const hugeValue = "x".repeat(200000000); // 200MB
    const result = validateValueSize(hugeValue, { maxValueSize: 1000000 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds");
  });
});
