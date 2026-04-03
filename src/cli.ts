#!/usr/bin/env node

import { Cache } from './index.js';

// Initialize cache instance for CLI operations
const cache = new Cache();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);

/**
 * Main CLI entry point
 * Routes commands to appropriate handlers
 */
async function main() {
  try {
    switch (command) {
      case 'status':
        await handleStatus();
        break;

      case 'clear':
        await handleClear();
        break;

      case 'stats':
        await handleStats();
        break;

      case 'keys':
        await handleKeys();
        break;

      case 'get':
        await handleGet(subArgs[0]);
        break;

      case 'set':
        await handleSet(subArgs[0], subArgs[1], subArgs[2]);
        break;

      case 'delete':
        await handleDelete(subArgs[0]);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      case 'version':
      case '--version':
      case '-v':
        showVersion();
        break;

      default:
        console.log('Unknown command:', command || 'none');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Display cache status information
 */
async function handleStatus() {
  console.log('Cachkit Status');
  console.log('━'.repeat(40));
  console.log('Cache is running');
  console.log('Provider: Memory (LRU)');
  console.log('Max items: 500');
}

/**
 * Clear all cached data
 */
async function handleClear() {
  await cache.clear();
  console.log('Cache cleared successfully!');
}

/**
 * Display cache statistics
 * Shows total number of cached keys and provider information
 */
async function handleStats() {
  const allKeys = await cache.keys();
  console.log('Cache Statistics');
  console.log('━'.repeat(40));
  console.log(`Keys: ${allKeys.length}`);
  console.log('Provider: Memory (LRU)');
  console.log('Max Items: 500');
}

/**
 * List all cached keys
 * Displays all keys currently stored in the cache
 */
async function handleKeys() {
  const allKeys = await cache.keys();
  console.log(`Cached Keys (${allKeys.length} total):`);
  console.log('━'.repeat(40));
  if (allKeys.length === 0) {
    console.log('No keys in cache');
  } else {
    allKeys.forEach((key, i) => {
      console.log(`${i + 1}. ${key}`);
    });
  }
}

/**
 * Retrieve a value from cache by key
 * Returns the cached value or undefined if not found
 */
async function handleGet(key?: string) {
  if (!key) {
    console.log('Error: Key required');
    console.log('Usage: cachkit get <key>');
    process.exit(1);
  }
  const value = await cache.get(key);
  if (value === undefined) {
    console.log(`Key not found: ${key}`);
  } else {
    console.log(`${key}:`);
    console.log(JSON.stringify(value, null, 2));
  }
}

/**
 * Store a value in cache with optional TTL
 * Supports setting expiration time in seconds
 */
async function handleSet(key?: string, value?: string, ttl?: string) {
  if (!key || !value) {
    console.log('Error: Key and value required');
    console.log('Usage: cachkit set <key> <value> [ttl]');
    process.exit(1);
  }
  const options = ttl ? { ttl: parseInt(ttl) * 1000 } : undefined;
  await cache.set(key, value, options);
  console.log(`Set ${key} = ${value}${ttl ? ` (TTL: ${ttl}s)` : ''}`);
}

/**
 * Delete a key from cache
 * Removes the specified key and its associated value
 */
async function handleDelete(key?: string) {
  if (!key) {
    console.log('Error: Key required');
    console.log('Usage: cachkit delete <key>');
    process.exit(1);
  }
  await cache.delete(key);
  console.log(`Deleted: ${key}`);
}

/**
 * Display help information
 * Shows available commands and usage examples
 */
function showHelp() {
  console.log(`
cachkit - High-performance caching CLI

Usage:
  cachkit <command> [options]

Commands:
  status              Show cache status
  clear               Clear all cached data
  stats               Show cache statistics
  keys                List all cached keys
  get <key>           Get a cached value
  set <key> <value> [ttl]  Set a cache value (TTL in seconds)
  delete <key>        Delete a cached key
  help                Show this help message
  version             Show version

Examples:
  cachkit status
  cachkit keys
  cachkit get user:1
  cachkit set user:1 '{"id":1,"name":"John"}' 3600
  cachkit delete user:1
  cachkit clear
  cachkit stats

Docs: https://github.com/Corex24/cachkit
  `);
}

/**
 * Display version information
 */
function showVersion() {
  console.log('cachkit v0.2.1');
}

// Start CLI
main();
