// Input validation and sanitization
// Keeps cache keys safe from injection attacks and other nonsense

export interface ValidationOptions {
  maxKeyLength?: number;
  maxValueSize?: number;
  allowedKeyChars?: RegExp;
}

const DEFAULT_MAX_KEY_LENGTH = 512;
const DEFAULT_MAX_VALUE_SIZE = 104857600; // 100MB
const DEFAULT_ALLOWED_KEY_CHARS = /^[\w:_-]+$/;

// Validate that a cache key is actually valid
// We're picky about keys to prevent injection attacks
export function validateKey(
  key: string,
  options: ValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxKeyLength = DEFAULT_MAX_KEY_LENGTH,
    allowedKeyChars = DEFAULT_ALLOWED_KEY_CHARS,
  } = options;

  if (typeof key !== "string") {
    return { valid: false, error: "Key must be a string" };
  }

  if (key.length === 0) {
    return { valid: false, error: "Key cannot be empty" };
  }

  if (key.length > maxKeyLength) {
    return {
      valid: false,
      error: `Key exceeds maximum length of ${maxKeyLength} characters`,
    };
  }

  if (!allowedKeyChars.test(key)) {
    return {
      valid: false,
      error: `Key contains invalid characters. Allowed: alphanumeric, colon, underscore, hyphen`,
    };
  }

  return { valid: true };
}

// Check if a TTL value makes sense
// We don't cache things for longer than a year (that's just silly)
export function validateTTL(
  ttl: number | undefined
): { valid: boolean; error?: string; ttl?: number } {
  if (ttl === undefined) {
    return { valid: true, ttl: undefined };
  }

  if (typeof ttl !== "number") {
    return { valid: false, error: "TTL must be a number" };
  }

  if (ttl < 0) {
    return { valid: false, error: "TTL cannot be negative" };
  }

  // Set maximum TTL to 1 year (365 days in ms)
  const MAX_TTL = 365 * 24 * 60 * 60 * 1000;
  if (ttl > MAX_TTL) {
    return { valid: false, error: `TTL cannot exceed ${MAX_TTL}ms (1 year)` };
  }

  return { valid: true, ttl };
}

/**
 * Validates value size to prevent memory exhaustion attacks
 */
export function validateValueSize(
  value: unknown,
  options: ValidationOptions = {}
): { valid: boolean; error?: string; size?: number } {
  const { maxValueSize = DEFAULT_MAX_VALUE_SIZE } = options;

  try {
    const serialized = JSON.stringify(value);
    const sizeInBytes = Buffer.byteLength(serialized, "utf8");

    if (sizeInBytes > maxValueSize) {
      return {
        valid: false,
        error: `Value exceeds maximum size of ${maxValueSize} bytes`,
        size: sizeInBytes,
      };
    }

    return { valid: true, size: sizeInBytes };
  } catch {
    return { valid: false, error: "Value is not serializable" };
  }
}

/**
 * Sanitizes key to remove suspicious patterns
 */
export function sanitizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "_");
}

/**
 * Validates pagination parameters to prevent abuse
 */
export function validatePaginationParams(
  limit?: number,
  offset?: number
): { valid: boolean; error?: string; limit?: number; offset?: number } {
  const MAX_LIMIT = 10000;
  const DEFAULT_LIMIT = 100;

  const safeLimit = limit ? Math.min(Math.max(1, limit), MAX_LIMIT) : DEFAULT_LIMIT;
  const safeOffset = offset ? Math.max(0, offset) : 0;

  if (limit && limit < 0) {
    return { valid: false, error: "Limit cannot be negative" };
  }

  if (offset && offset < 0) {
    return { valid: false, error: "Offset cannot be negative" };
  }

  return { valid: true, limit: safeLimit, offset: safeOffset };
}
