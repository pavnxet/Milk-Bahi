// Shared pure helpers (no DOM, no Capacitor) for Milk Bahi.
// Bundled via esbuild ESM relative imports from app.js and csvHelper.js.

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;
export const MAX_ENTRY_VALUE = 1e7;
export const MAX_NOTE_LENGTH = 200;

/**
 * Parse a "YYYY-MM-DD" key into a local Date (avoids UTC-shift bugs).
 * Returns an Invalid Date when the input is malformed.
 */
export function parseLocalDate(s) {
    const parts = String(s ?? '').split('-');
    if (parts.length !== 3) return new Date(NaN);
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return new Date(NaN);
    return new Date(y, m - 1, d);
}

/**
 * Make a string safe for use as a file name.
 */
export function sanitizeFilename(s) {
    return String(s ?? '').replace(/[\/\\:, ]+/g, '_');
}

/**
 * True when a Share error means the user dismissed the sheet (not a real failure).
 */
export function isShareDismissed(err) {
    const msg = err && err.message ? err.message : String(err ?? '');
    return /cancel/i.test(msg);
}

/**
 * Calculates the entry values based on defaults.
 * Single source of truth — imported by both app.js and csvHelper.js.
 */
export function calculateEntry(val, defaultCowPrice, defaultBuffaloPrice) {
    const src = val && typeof val === 'object' ? val : {};
    const cow = src.cow || 0;
    const buffalo = src.buffalo || 0;
    const cowPrice = src.cowPrice !== undefined ? src.cowPrice : defaultCowPrice;
    const buffaloPrice = src.buffaloPrice !== undefined ? src.buffaloPrice : defaultBuffaloPrice;
    const cost = (cow * cowPrice) + (buffalo * buffaloPrice);
    return { cow, buffalo, cowPrice, buffaloPrice, cost };
}

function isValidAmount(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < MAX_ENTRY_VALUE;
}

/**
 * True when val is a well-formed entry object (null/non-objects rejected).
 */
export function isValidEntry(val) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    for (const k of ['cow', 'buffalo', 'cowPrice', 'buffaloPrice']) {
        if (val[k] !== undefined && !isValidAmount(val[k])) return false;
    }
    if (val.note !== undefined && typeof val.note !== 'string') return false;
    if (val.reminderTime !== undefined && (typeof val.reminderTime !== 'string' || !TIME_RE.test(val.reminderTime))) return false;
    return true;
}

/**
 * Sanitize a whole data map: keep only YYYY-MM-DD keys with real calendar
 * dates, convert legacy number-format entries, drop invalid amounts,
 * cap notes at 200 chars. Always returns a fresh plain object.
 */
export function sanitizeData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const out = {};
    for (const [key, raw] of Object.entries(data)) {
        if (!DATE_KEY_RE.test(key)) continue;
        // Drop real-invalid dates (e.g. month 13, Feb 30) via round-trip check.
        const [ys, ms, ds] = key.split('-').map(Number);
        const dt = new Date(ys, ms - 1, ds);
        if (dt.getFullYear() !== ys || dt.getMonth() !== ms - 1 || dt.getDate() !== ds) continue;

        let entry = raw;
        if (typeof entry === 'number') {
            // Legacy number format: bare cow litres.
            if (!isValidAmount(entry)) continue;
            entry = { cow: entry, buffalo: 0 };
        } else if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }

        const clean = {};
        let bad = false;
        for (const f of ['cow', 'buffalo', 'cowPrice', 'buffaloPrice']) {
            const v = entry[f];
            if (v === undefined) {
                if (f === 'cow' || f === 'buffalo') clean[f] = 0;
                continue;
            }
            if (!isValidAmount(v)) { bad = true; break; }
            clean[f] = v;
        }
        if (bad) continue;
        if (typeof entry.note === 'string' && entry.note.length > 0) {
            clean.note = entry.note.slice(0, MAX_NOTE_LENGTH);
        }
        if (typeof entry.reminderTime === 'string' && TIME_RE.test(entry.reminderTime)) {
            clean.reminderTime = entry.reminderTime;
        }
        out[key] = clean;
    }
    return out;
}

/**
 * Local "YYYY-MM-DD" key for today (matches the keys used in state.data).
 */
export function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * True when a date key lies after today. ISO zero-padded keys compare
 * correctly as plain strings.
 */
export function isFutureKey(key, today = todayKey()) {
    return typeof key === 'string' && key > today;
}

/**
 * Star-prompt cadence: nudge at most every N successful report shares.
 */
export const STAR_PROMPT_EVERY = 3;
export function shouldPromptStar(count) {
    return Number.isInteger(count) && count > 0 && count % STAR_PROMPT_EVERY === 0;
}

/**
 * Numeric version compare for tags like "v3.2.0", "3.2.0.41" (release tags
 * carry the Actions run number as a 4th segment). Missing segments count
 * as 0. Returns 1 / 0 / -1.
 */
function verParts(v) {
    return String(v || '').trim().replace(/^v/i, '').split('.').map((n) => {
        const x = parseInt(n, 10);
        return Number.isFinite(x) && x >= 0 ? x : 0;
    });
}
export function compareVersions(a, b) {
    const pa = verParts(a);
    const pb = verParts(b);
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i++) {
        const x = pa[i] || 0;
        const y = pb[i] || 0;
        if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
}

/**
 * Decides whether a GitHub release should ping the user. Manual control:
 * the release body must contain a [notify] marker (added via the
 * `send_notification` workflow input), the tag must be newer than both the
 * installed version and the last notified tag.
 */
export function shouldNotifyRelease(release, currentVersion, lastNotifiedVersion) {
    const tag = release && typeof release.tag === 'string' ? release.tag : '';
    const body = release && typeof release.body === 'string' ? release.body : '';
    if (!/^\s*v?\d+\.\d+\.\d+/.test(tag)) return { notify: false };
    if (!/\[notify\]/i.test(body)) return { notify: false };
    if (compareVersions(tag, currentVersion) <= 0) return { notify: false };
    if (lastNotifiedVersion && compareVersions(tag, lastNotifiedVersion) <= 0) return { notify: false };
    return { notify: true, version: tag };
}
