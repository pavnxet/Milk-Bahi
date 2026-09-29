# Milk Bahi App 🥛

A sleek, mobile-first application for tracking daily milk delivery. Designed for simplicity, ease of use, and complete data ownership.

## Features

- **Daily Entry**: Log milk quantity with a simple tap.
- **Analytics**: Visualize daily milk usage and expenses with interactive charts (Cow vs Buffalo, Daily Cost, Trends).
- **History**: View and manage all past entries in a dedicated list.
- **Data Persistence**: Automatically saves data to a local file in your device's Documents folder.
- **Backup & Restore**: Manual backup option available to ensure you never lose your data.
- **Installable (APK)**: Native Android APK build available via GitHub Actions.
- **Reports**: Export PDF and CSV reports for specific date ranges.
- **WhatsApp Export**: Send formatted summaries directly to your milkman.

## Security & Safety 🛡️

We take security seriously. Every release of **Milk Bahi** is automatically scanned by **VirusTotal** to ensure it is free from malware or viruses.

You can verify the safety of any release by checking the scan results linked in the Release notes.

## How to Install (Android APK)

1. Go to the **Releases** section of this repository.
2. Download the latest `Milk_Bahi_vX.X.apk`.
3. Open the file on your Android phone and install it (you may need to allow installation from unknown sources).

## How to Build the APK (GitHub Actions)

1. Go to the **Actions** tab in this repository.
2. Select the **Build Android APK** workflow on the left.
3. Click **Run workflow** (button on the right).
4. Wait for the build to complete.
5. The new APK will be available in the **Releases** section or as an artifact.

## How to Backup Data

To ensure your data is never lost:

1. Open the app.
2. Tap the **Settings** (Gear) icon.
3. Scroll down to **Data Backup**.
4. Tap **Backup**. A file named `milk-tracker-backup-YYYY-MM-DD.json` will be saved to your device.

To restore data later:
1. Tap **Restore**.
2. Select the backup file from your phone.

## Google Drive backup setup

The app can back up to Google Drive (Settings → Google Drive → Sign in →
Backup) and restore the newest Drive backup. This needs a Google Cloud OAuth
client — the app ships with a placeholder until you add yours:

1. Go to the [Google Cloud Console](https://console.cloud.google.com) and
   create (or select) a project.
2. **APIs & Services → Library**: enable the **Google Drive API**.
3. **APIs & Services → OAuth consent screen**: choose **External**, fill in
   the app name + support email, and add yourself under **Test users**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → type **Web application**. (No redirect URI is needed for the native
   sign-in flow.)
5. Copy the **Client ID** (it ends with `.apps.googleusercontent.com`) and
   paste it as `GOOGLE_WEB_CLIENT_ID` in `src/driveBackup.js`.
6. Run `npm run build` to rebuild the app.

Notes:
- Scope is `drive.file` (app-created files only) — the web client ID alone is
  enough for this sign-in → upload → download flow; no Android client / SHA-1
  fingerprint is required unless Google changes the policy.
- Backups are named `milk-tracker-backup-YYYY-MM-DD.json`; restore always
  picks the newest one.
- Honest status: the code path is **not tested end-to-end** here — it needs
  your Cloud project + a real device sign-in to verify.

## Technical Details

- **Stack**: HTML, CSS, JavaScript (Vanilla).
- **Framework**: Capacitor (Hybrid App).
- **Build**: `npm run build` (uses esbuild) + GitHub Actions.

## Why does Google call it "unsafe"?

Short version: it isn't — Google flags **any** app installed outside the Play Store
("unknown developer", no install reputation). The code is open, every release APK is
[VirusTotal-scanned](https://www.virustotal.com) with 0 detections, and releases are
built by GitHub Actions from this source. The only way to remove the warning entirely
is publishing on Google Play (a $25 one-time developer account) — planned, not done yet.
