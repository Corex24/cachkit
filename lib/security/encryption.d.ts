export interface EncryptionConfig {
    enabled: boolean;
    algorithm?: "aes-256-gcm";
    key?: string;
}
export interface EncryptedValue {
    encrypted: true;
    algorithm: string;
    iv: string;
    authTag: string;
    data: string;
}
export declare function generateEncryptionKey(): string;
export declare function encrypt(value: string, keyHex: string, algorithm?: string): EncryptedValue;
export declare function decrypt(encryptedPayload: EncryptedValue, keyHex: string): string;
export declare function validateEncryptionConfig(config: EncryptionConfig): {
    valid: boolean;
    error?: string;
};
