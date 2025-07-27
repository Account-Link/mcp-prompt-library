#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Running tests for MCP Prompt Manager...');

try {
  // Run vitest directly
  execSync('npx vitest run --config ./vitest.config.ts', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Tests failed:', error.message);
  process.exit(1);
} 