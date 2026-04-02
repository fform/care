#!/usr/bin/env node
/**
 * Deploy scripts use `op run --env-file=.env` from the repo root.
 * Fail fast with a clear message if `.env` is missing (common mistake: only `app/.env`).
 */
import { accessSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  accessSync(join(root, '.env'));
} catch {
  console.error(
    'care: missing .env at repository root (needed for `op run` + deploy).\n' +
      '  cp .env.example .env\n' +
      '  # then set SERVICE_ACCOUNT_KEY and any op:// references'
  );
  process.exit(1);
}
