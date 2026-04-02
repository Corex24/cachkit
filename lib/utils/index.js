import { encode, decode } from "msgpack-lite";
// Serialize a value to binary format using MessagePack
export function serialize(value) {
    return encode(value);
}
// Deserialize binary data back to the original value
export function deserialize(buffer) {
    return decode(buffer);
}
// Check if something expired based on its timestamp and TTL
export function isExpired(timestamp, ttl) {
    return Date.now() - timestamp > ttl;
}
// Combine a key with its namespace prefix
export function generateKey(prefix, key) {
    return `${prefix}:${key}`;
}
