#!/usr/bin/env node
/**
 * Single root `package.json` "start" script for Railpack + Railway monorepo deploys.
 * Railpack only looks at the repo root; each service still uses the same entrypoint here,
 * and we branch on Railway-injected service identity.
 *
 * Prefer naming Railway services exactly `api` and `web`, or set CARE_SERVICE=api|web per service.
 */
import { spawnSync } from 'node:child_process';

function resolveTarget() {
  const explicit = process.env.CARE_SERVICE?.trim().toLowerCase();
  if (explicit === 'web' || explicit === 'api') {
    return explicit;
  }

  const name = (process.env.RAILWAY_SERVICE_NAME || '').trim().toLowerCase();
  if (name === 'web' || name === 'www') {
    return 'web';
  }
  if (name === 'api') {
    return 'api';
  }
  // Heuristic for display names like "Care — web"
  if (/\bweb\b/.test(name) && !/\bapi\b/.test(name)) {
    return 'web';
  }
  if (/\bapi\b/.test(name)) {
    return 'api';
  }

  if (!name) {
    // Railpack only checks that root "start" exists; some phases run without Railway env.
    console.warn('[care] railway-root-start: no RAILWAY_SERVICE_NAME — defaulting to api');
    return 'api';
  }

  console.error(
    '[care] Cannot infer api vs web from service name. Rename the service to `api` or `web`, ' +
      'or set CARE_SERVICE=api|web. ' +
      `RAILWAY_SERVICE_NAME=${JSON.stringify(process.env.RAILWAY_SERVICE_NAME)}`
  );
  process.exit(1);
}

const target = resolveTarget();
const args =
  target === 'web'
    ? ['pnpm', '--filter', '@care/web', 'start']
    : ['pnpm', 'run', 'start:api'];

const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', env: process.env });
process.exit(result.status === null ? 1 : result.status);
