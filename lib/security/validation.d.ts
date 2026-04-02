export interface ValidationOptions {
    maxKeyLength?: number;
    maxValueSize?: number;
    allowedKeyChars?: RegExp;
}
export declare function validateKey(key: string, options?: ValidationOptions): {
    valid: boolean;
    error?: string;
};
export declare function validateTTL(ttl: number | undefined): {
    valid: boolean;
    error?: string;
    ttl?: number;
};
/**
 * Validates value size to prevent memory exhaustion attacks
 */
export declare function validateValueSize(value: unknown, options?: ValidationOptions): {
    valid: boolean;
    error?: string;
    size?: number;
};
/**
 * Sanitizes key to remove suspicious patterns
 */
export declare function sanitizeKey(key: string): string;
/**
 * Validates pagination parameters to prevent abuse
 */
export declare function validatePaginationParams(limit?: number, offset?: number): {
    valid: boolean;
    error?: string;
    limit?: number;
    offset?: number;
};
