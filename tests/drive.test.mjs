// Drive backup pure-helper tests (no native plugins, no network).
// driveBackup.js keeps its @capacitor/google-auth import lazy (inside
// driveSignIn), so this file can import the pure helpers under plain node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDriveListQuery, driveSignIn } from '../src/driveBackup.js';

test('buildDriveListQuery targets app backups and excludes trash', () => {
    const q = buildDriveListQuery();
    assert.ok(q.includes("name contains 'milk-tracker-backup'"), `query: ${q}`);
    assert.ok(q.includes('trashed = false'), `query: ${q}`);
});

test('driveSignIn throws a friendly setup error while the client ID is a placeholder', async () => {
    await assert.rejects(
        () => driveSignIn(),
        (err) => {
            assert.ok(err instanceof Error);
            assert.ok(/not set up yet/i.test(err.message), `message: ${err.message}`);
            assert.ok(/GOOGLE_WEB_CLIENT_ID/.test(err.message), `message: ${err.message}`);
            return true;
        }
    );
});
