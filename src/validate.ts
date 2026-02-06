/**
 * DCYFR AI Docker - CLI Validate Entry Point
 *
 * Validates a Dockerfile against DCYFR best practices.
 * Usage: node --import tsx src/validate.ts [path-to-Dockerfile]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDockerfile } from './validator.js';

const filePath = process.argv[2] ?? 'Dockerfile';
const resolved = resolve(filePath);

let content: string;
try {
  content = readFileSync(resolved, 'utf-8');
} catch {
  console.error(`❌ Could not read file: ${resolved}`);
  process.exit(1);
}

console.log(`🔍 Validating: ${resolved}\n`);

const result = validateDockerfile(content);

if (result.errors.length > 0) {
  console.log('❌ Errors:');
  for (const err of result.errors) {
    console.log(`  [${err.rule}] ${err.message}`);
  }
  console.log('');
}

if (result.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  for (const warn of result.warnings) {
    console.log(`  [${warn.rule}] ${warn.message}`);
  }
  console.log('');
}

console.log(`Score: ${result.score}/100`);
console.log(`Valid: ${result.valid ? '✅ Yes' : '❌ No'}`);

process.exit(result.valid ? 0 : 1);
