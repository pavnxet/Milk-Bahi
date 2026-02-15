# Milk Tracker App 🥛

A sleek, mobile-first web application for tracking daily milk delivery. Designed for simplicity and ease of use.

## Features

- **Daily Entry**: Log milk quantity with a simple tap.
- **Monthly Summary**: Auto-calculates total liters and cost.
- **Data Persistence**: Uses `localStorage` so data stays on your phone.
- **Backup & Restore**: Download your data as a file to keep it safe in your phone storage.
- **Cloud Sync (Optional)**: Connect to Firebase for real-time cloud backup.
- **Installable (PWA)**: Add to your home screen for an app-like experience.
- **WhatsApp Export**: Send monthly reports directly to your milkman.

## How to Install as an App (Android)

1. Open the website in **Chrome** on your Android phone.
2. Tap the **three dots** (menu) in the top-right corner.
3. Tap **"Add to Home screen"** or **"Install App"**.
4. The Milk Tracker icon will appear on your home screen.

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
- **PWA**: Service Worker for offline support + Manifest for installation.
- **Hosting**: Ready for GitHub Pages.
