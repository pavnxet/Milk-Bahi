// sync-version fixture test: copies package.json + sw.js + index.html snippets
// to a temp dir, runs scripts/sync-version.js against it, and asserts every
// generated/patched artifact carries the package version.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', 'scripts', 'sync-version.js');

function makeFixture(version) {
    const root = mkdtempSync(join(os.tmpdir(), 'milkbahi-ver-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'www'), { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'milk-bahi', version }));
    writeFileSync(join(root, 'www', 'sw.js'), `const CACHE_NAME = 'milk-tracker-v0.0.0';\n`);
    writeFileSync(
        join(root, 'www', 'index.html'),
        '<button>Check for Updates v0.0.0</button><p>Milk Bahi v0.0.0</p>\n'
    );
    return root;
}

test('sync-version propagates package.json version to all artifacts', () => {
    const root = makeFixture('9.8.7');
    execFileSync(process.execPath, [script, root], { stdio: 'pipe' });

    assert.equal(
        readFileSync(join(root, 'src', 'version.js'), 'utf8'),
        'export const APP_VERSION = "9.8.7";\n'
    );
    assert.equal(
        JSON.parse(readFileSync(join(root, 'www', 'version.json'), 'utf8')).version,
        '9.8.7'
    );
    assert.ok(
        readFileSync(join(root, 'www', 'sw.js'), 'utf8').includes('milk-tracker-v9.8.7'),
        'CACHE_NAME updated'
    );
    const html = readFileSync(join(root, 'www', 'index.html'), 'utf8');
    assert.ok(html.includes('Check for Updates v9.8.7'), 'update button updated');
    assert.ok(html.includes('Milk Bahi v9.8.7'), 'footer updated');
    assert.ok(!/\bv\d+\.\d+\.\d+\b/.test(html.replaceAll('v9.8.7', '')), 'no stale versions left');
});

test('sync-version is idempotent (second run changes nothing)', () => {
    const root = makeFixture('1.2.3');
    const first = execFileSync(process.execPath, [script, root], { encoding: 'utf8' });
    assert.ok(first.includes('wrote src/version.js'), `first run output: ${first}`);
    const second = execFileSync(process.execPath, [script, root], { encoding: 'utf8' });
    assert.ok(second.includes('already at 1.2.3 (unchanged)'), `second run output: ${second}`);
    assert.equal(
        readFileSync(join(root, 'src', 'version.js'), 'utf8'),
        'export const APP_VERSION = "1.2.3";\n'
    );
});
