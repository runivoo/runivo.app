// Runs after `npm install` / `npm ci`:
//   1. patch-package: applies patches/ to node_modules (expo, maplibre: mobile only)
//   2. sync-engine: writes supabase/functions/_shared/runEngine.ts
//
// patch-package is started through node, not through node_modules/.bin. The .bin link
// is missing in some installs (Vercel's build failed with "patch-package: command not
// found" even though the package was installed), and the web build needs neither patch.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const run = (args) => spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' }).status ?? 1;

let patchPackage = null;
try { patchPackage = require.resolve('patch-package/index.js'); } catch { /* not installed */ }

if (process.env.VERCEL) {
  // Web deploys install only apps/web (vercel.json); the patches are for the mobile
  // app's native packages, which aren't installed there.
  console.log('postinstall: Vercel web build, skipping mobile patches.');
} else if (patchPackage) {
  const code = run([patchPackage]);
  if (code !== 0) process.exit(code);
} else {
  console.error('postinstall: patch-package is missing; run `npm ci` with devDependencies included.');
  process.exit(1);
}

process.exit(run([resolve(root, 'scripts/sync-engine.mjs'), '--if-present']));
