export declare function serialize(value: any): Buffer;
export declare function deserialize<T = any>(buffer: Buffer): T;
export declare function isExpired(timestamp: number, ttl: number): boolean;
export declare function generateKey(prefix: string, key: string): string;
