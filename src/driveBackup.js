// Google Drive backup: sign-in via @capacitor/google-auth, file transfer via
// the Drive v3 REST API with fetch (bundled ESM, no Capacitor Filesystem).
//
// SETUP (required before this works — needs the dev's Google Cloud project):
//   1. Go to https://console.cloud.google.com and create/select a project.
//   2. "APIs & Services" -> "Library": enable the "Google Drive API".
//   3. "APIs & Services" -> "OAuth consent screen": choose External, fill the
//      app name + support email, add yourself under "Test users".
//   4. "APIs & Services" -> "Credentials" -> "Create Credentials" ->
//      "OAuth client ID" -> type "Web application". (No redirect URI needed
//      for the native GoogleAuth flow; the ID is only used to identify the app.)
//   5. Copy the "Client ID" (ends with .apps.googleusercontent.com) and paste
//      it below as GOOGLE_WEB_CLIENT_ID. Then `npm run build` to rebuild.
// Android note: scope is drive.file (app-created files only), so the web
// client ID alone is enough for this sign-in -> upload -> download flow; no
// separate Android client / SHA-1 is required unless Google changes policy.

export const GOOGLE_WEB_CLIENT_ID = "PASTE_YOUR_WEB_CLIENT_ID_HERE";

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const BACKUP_NAME_FRAGMENT = 'milk-tracker-backup';

let googleAuthInitDone = false;

function assertClientId() {
    if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID === "PASTE_YOUR_WEB_CLIENT_ID_HERE") {
        throw new Error(
            'Google Drive is not set up yet: paste your OAuth web client ID into ' +
            'GOOGLE_WEB_CLIENT_ID in src/driveBackup.js (see README "Google Drive backup setup").'
        );
    }
}

// Pure query builder (unit-tested): newest app backup, excluding trash.
export function buildDriveListQuery() {
    return `name contains '${BACKUP_NAME_FRAGMENT}' and trashed = false`;
}

// Sign in with Google and return { accessToken, email }. Throws a human
// message on every failure (placeholder ID, cancelled, offline). Callers
// handle UI (alert/Toast); this module never touches the DOM.
export async function driveSignIn() {
    assertClientId();
    let GoogleAuth;
    try {
        // NOTE: there is no official @capacitor/google-auth package on npm;
        // the maintained community plugin is @codetrix-studio/capacitor-google-auth.
        ({ GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth'));
    } catch (_) {
        throw new Error('Google sign-in is unavailable (native plugin failed to load). Rebuild the app and try again.');
    }
    try {
        if (!googleAuthInitDone) {
            await GoogleAuth.initialize({
                clientId: GOOGLE_WEB_CLIENT_ID,
                scopes: [DRIVE_SCOPE],
                grantOfflineAccess: false
            });
            googleAuthInitDone = true;
        }
        const user = await GoogleAuth.signIn();
        const accessToken = user && user.authentication && user.authentication.accessToken;
        if (!accessToken) {
            throw new Error('no access token was returned. Please try again.');
        }
        return { accessToken, email: user.email || '' };
    } catch (e) {
        if (e instanceof Error && /not set up yet/.test(e.message)) throw e;
        const detail = e instanceof Error && e.message ? e.message : 'please try again.';
        throw new Error(`Google sign-in failed: ${detail}`);
    }
}

// Upload a backup file. Returns the created file resource.
export async function driveUpload(filename, jsonText, token) {
    const metadata = { name: filename, mimeType: 'application/json' };
    const boundary = 'milkbahi' + Date.now().toString(36);
    const body =
        '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' +
        jsonText +
        '\r\n--' + boundary + '--';
    let res;
    try {
        res = await fetch(DRIVE_UPLOAD_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
        });
    } catch (_) {
        throw new Error('Drive upload failed: no network connection. Check the internet and try again.');
    }
    if (!res.ok) {
        throw new Error(`Drive upload failed (HTTP ${res.status}). Please sign in again and retry.`);
    }
    return res.json();
}

// Find the newest milk-tracker backup on Drive, or null when none exists.
export async function driveFindNewest(token) {
    const params = new URLSearchParams({
        q: buildDriveListQuery(),
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,modifiedTime)',
        pageSize: '1'
    });
    let res;
    try {
        res = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (_) {
        throw new Error('Drive search failed: no network connection. Check the internet and try again.');
    }
    if (!res.ok) {
        throw new Error(`Drive search failed (HTTP ${res.status}). Please sign in again and retry.`);
    }
    const json = await res.json();
    const files = (json && json.files) || [];
    return files.length > 0 ? files[0] : null;
}

// Download a Drive file's raw text content.
export async function driveDownload(fileId, token) {
    let res;
    try {
        res = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (_) {
        throw new Error('Drive download failed: no network connection. Check the internet and try again.');
    }
    if (!res.ok) {
        throw new Error(`Drive download failed (HTTP ${res.status}). Please sign in again and retry.`);
    }
    return res.text();
}
