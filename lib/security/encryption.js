// AES-256-GCM encryption for when you really care about keeping your cache secret
// This module handles at-rest encryption for sensitive cached values
import crypto from "crypto";
// Generate a fresh encryption key
// Store this securely in your .env file, don't commit it to git!
export function generateEncryptionKey() {
    return crypto.randomBytes(32).toString("hex");
}
// Encrypt a value using AES-256-GCM
// Returns the encrypted payload along with the IV (initialization vector) and auth tag
export function encrypt(value, keyHex, algorithm = "aes-256-gcm") {
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return {
        encrypted: true,
        algorithm,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        data: encrypted,
    };
}
// Decrypt a value that was encrypted with encrypt()
// If the authentication tag doesn't match, this will throw an error
// (which means someone tampered with the encrypted payload)
export function decrypt(encryptedPayload, keyHex) {
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(encryptedPayload.iv, "hex");
    const authTag = Buffer.from(encryptedPayload.authTag, "hex");
    const decipher = crypto.createDecipheriv(encryptedPayload.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedPayload.data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
// Make sure the encryption config is valid
// This prevents common mistakes like forgetting to set the encryption key
export function validateEncryptionConfig(config) {
    if (!config.enabled) {
        return { valid: true };
    }
    if (!config.key) {
        return { valid: false, error: "Encryption key is required when encryption is enabled" };
    }
    if (!/^[a-f0-9]{64}$/.test(config.key)) {
        return {
            valid: false,
            error: "Encryption key must be 64 hex characters (32 bytes for AES-256)",
        };
    }
    return { valid: true };
}
