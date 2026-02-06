/**
 * DCYFR AI Docker - CLI Generate Entry Point
 *
 * Generates Docker configuration files.
 * Usage: node --import tsx src/generate.ts [--type api|web|worker|static] [--db postgres] [--redis]
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateProject } from './generator.js';
import type { GenerateOptions } from './types.js';

// Parse simple CLI args
const args = process.argv.slice(2);
const options: Partial<GenerateOptions> = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  switch (arg) {
    case '--type':
      options.appType = next as GenerateOptions['appType'];
      i++;
      break;
    case '--db':
    case '--database':
      options.database = next as GenerateOptions['database'];
      i++;
      break;
    case '--redis':
      options.redis = true;
      break;
    case '--nginx':
      options.nginx = true;
      break;
    case '--target':
      options.target = next as GenerateOptions['target'];
      i++;
      break;
    case '--output':
    case '-o':
      options.outputDir = next;
      i++;
      break;
    case '--help':
    case '-h':
      console.log('Usage: generate [options]');
      console.log('');
      console.log('Options:');
      console.log('  --type <api|web|worker|static>    Application type (default: api)');
      console.log('  --db <none|postgres|mysql|sqlite>  Database (default: none)');
      console.log('  --redis                            Include Redis');
      console.log('  --nginx                            Include Nginx reverse proxy');
      console.log('  --target <dev|prod|both>           Target environment (default: both)');
      console.log('  --output, -o <dir>                 Output directory (default: .)');
      process.exit(0);
  }
}

console.log('🐳 Generating Docker configuration...\n');

const files = generateProject(options);
const outputDir = options.outputDir ?? '.';

mkdirSync(outputDir, { recursive: true });

for (const [filename, content] of Object.entries(files)) {
  const filePath = join(outputDir, filename);
  writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${filePath}`);
}

console.log(`\n📦 Generated ${Object.keys(files).length} files.`);
