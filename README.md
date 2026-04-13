# Milk Bahi App 🥛

A sleek, mobile-first application for tracking daily milk delivery. Designed for simplicity, ease of use, and complete data ownership.

## Features

- **Daily Entry**: Log milk quantity with a simple tap.
- **👨‍👩‍👧 Family Sync**: Synchronize your milk data across multiple devices in real-time.
- **Analytics**: Visualize daily milk usage and expenses with interactive charts (Cow vs Buffalo, Daily Cost, Trends).
- **History**: View and manage all past entries in a dedicated list.
- **Robust Storage**: Uses a local SQLite database for fast and reliable data persistence.
- **Automatic Migration**: Your existing JSON data is automatically migrated to the new database on the first run.
- **Backup & Restore**: Manual backup option available for complete peace of mind.
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

## How to Use Family Sync 🔄

Milk Bahi now supports multi-device synchronization using Turso and Cloudflare Workers.

### For the Primary Device (Host):
1. Go to **Settings** (Gear icon).
2. Scroll to **Family Sync**.
3. Enter your **Turso Database URL** and **Auth Token**.
4. Tap **Generate Sharing Code**.
5. Share the 6-character code with your family members.

### For Family Members (Joining):
1. Go to **Settings** -> **Family Sync**.
2. Enter the **Sharing Code** provided by the host.
3. Tap **Join Family Sync**.
4. Your data will now automatically sync between both devices!

## How to Build the APK (GitHub Actions)

1. Go to the **Actions** tab in this repository.
2. Select the **Build Android APK** workflow on the left.
3. Click **Run workflow** (button on the right).
4. Wait for the build to complete.
5. The new APK will be available in the **Releases** section or as an artifact.

> [!IMPORTANT]
> To enable the Family Sync feature in your own build, you must add a GitHub Secret named `SYNC_API_SECRET` to your repository with your Cloudflare Worker secret.

## Technical Details

- **Stack**: HTML, CSS, JavaScript (Vanilla).
- **Data Layer**: SQLite (Libsql) with Turso for cloud synchronization.
- **Cloud Infrastructure**: Cloudflare Workers for code resolution.
- **Framework**: Capacitor (Hybrid App).
- **Build**: `npm run build` (uses esbuild) + GitHub Actions.

Made with ❤️ by Pavneet
