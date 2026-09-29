// Single-source version sync: package.json -> generated artifacts.
// Usage: node scripts/sync-version.js [root]  (root defaults to repo root,
// derived from this script's own path). Node stdlib only. Idempotent.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] || join(scriptDir, '..');

const pkgPath = join(root, 'package.json');
const versionJsPath = join(root, 'src', 'version.js');
const versionJsonPath = join(root, 'www', 'version.json');
const swPath = join(root, 'www', 'sw.js');
const htmlPath = join(root, 'www', 'index.html');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`sync-version: invalid version "${version}" in package.json`);
  process.exit(1);
}

// 1. src/version.js (generated, committed)
const versionJs = `export const APP_VERSION = "${version}";\n`;
writeVersionFile(versionJsPath, versionJs, 'src/version.js');

// 2. www/version.json
const versionJson = JSON.stringify({ version }, null, 2) + '\n';
writeVersionFile(versionJsonPath, versionJson, 'www/version.json');

// 3. www/sw.js CACHE_NAME: milk-tracker-vX.Y.Z
patchFile(swPath, 'www/sw.js', (text) => {
  const next = text.replace(/milk-tracker-v\d+\.\d+\.\d+/g, `milk-tracker-v${version}`);
  return next === text ? null : next;
});

// 4. www/index.html: "Check for Updates vX.Y.Z" + "Milk Bahi vX.Y.Z"
patchFile(htmlPath, 'www/index.html', (text) => {
  let next = text
    .replace(/Check for Updates v\d+\.\d+\.\d+/g, `Check for Updates v${version}`)
    .replace(/Milk Bahi v\d+\.\d+\.\d+/g, `Milk Bahi v${version}`);
  return next === text ? null : next;
});

function writeVersionFile(path, content, label) {
  const prev = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (prev === content) {
    console.log(`sync-version: ${label} already at ${version} (unchanged)`);
    return;
  }
  writeFileSync(path, content, 'utf8');
  console.log(`sync-version: wrote ${label} -> ${version}`);
}

function patchFile(path, label, fn) {
  const prev = readFileSync(path, 'utf8');
  const next = fn(prev);
  if (next === null) {
    console.log(`sync-version: ${label} already at ${version} (unchanged)`);
    return;
  }
  writeFileSync(path, next, 'utf8');
  console.log(`sync-version: patched ${label} -> ${version}`);
}
