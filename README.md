# Milk Tracker App 🥛

A sleek, mobile-first web application for tracking daily milk delivery. Designed for simplicity and ease of use.

## Features

- **Daily Entry**: Log milk quantity with a simple tap.
- **Analytics**: Visualize daily milk usage and expenses with interactive charts.
- **History**: View and manage all past entries in a dedicated list.
- **Data Persistence**: Automatically saves data to a local file in your device's Documents folder.
- **Backup & Restore**: Manual backup option available.
- **Installable (APK)**: Native Android APK build available via GitHub Actions.
- **WhatsApp Export**: Send monthly reports directly to your milkman.

## How to Install (Android APK)

1. Go to the **Releases** section of this repository.
2. Download the latest `app-debug.apk`.
3. Open the file on your Android phone and install it (you may need to allow installation from unknown sources).

## How to Build the APK (GitHub Actions)

1. Go to the **Actions** tab in this repository.
2. Select the **Build Android APK** workflow on the left.
3. Click **Run workflow** (button on the right).
4. Wait for the build to complete.
5. The new APK will be available in the **Releases** section or as an artifact.

## How to Backup Data

To ensure your data is never lost (even if you clear your browser):

1. Open the app.
2. Tap the **Settings** (Gear) icon.
3. Scroll down to **Data Backup**.
4. Tap **Backup**. A file named `milk-tracker-backup-YYYY-MM-DD.json` will be saved to your **Downloads** folder.

To restore data later:
1. Tap **Restore**.
2. Select the backup file from your phone.

## Technical Details

- **Stack**: HTML, CSS, JavaScript (Vanilla).
- **Framework**: Capacitor (Hybrid App).
- **Build**: `npm run build` (uses esbuild) + GitHub Actions.
