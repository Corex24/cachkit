#!/usr/bin/env node

/**
 * Engine Requirement Checker
 * Validates that the current Node.js version meets the project requirements
 */

const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.error(
    `\n❌ Unsupported Node.js version detected.\n` +
    `   Current: ${process.versions.node} | Required: Node.js 20+\n` +
    `   Please upgrade to continue.\n`
  );
  process.exit(1);
}