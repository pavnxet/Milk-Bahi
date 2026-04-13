# 🔐 Milk Bahi: Sync Setup Guide

This guide will help you connect your Milk Bahi app to your private Turso database and Cloudflare worker for secure, multi-device synchronization.

---

## Part 1: Choose Your Secret 🔑

Think of a "Master Password" for your sync service. This secret ensures that only *your* app can talk to *your* worker.
*   **Example**: `MilkSync_Secret_2024_Safe`

---

## Part 2: Configure Cloudflare Worker ☁️

The worker needs to know your secret so it can verify requests from the app.

1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** -> Select your **milk-bahi** worker.
3.  Click the **Settings** tab at the top.
4.  Click **Variables** on the left sidebar.
5.  In the **Environment Variables** section, click **Add Variable** (or Edit).
6.  Set the Name as **`API_KEY`**.
7.  Set the Value as your **chosen secret**.
8.  Click **Save and Deploy**.

---

## Part 3: Configure GitHub Secrets 🤖

The GitHub build process needs the secret to "inject" it into the app's code during the APK creation.

1.  Go to your repository on **GitHub**.
2.  Click **Settings** -> **Secrets and variables** -> **Actions**.
3.  Click **New repository secret**.
4.  Name: **`SYNC_API_SECRET`**.
5.  Value: Your **chosen secret** (must match the one in Cloudflare).
6.  Click **Add secret**.

---

## Part 4: Connect the App 📱

Once your APK is built and installed:

1.  Open Milk Bahi and tap **Settings** (Gear icon).
2.  Go to **Family Sync**.
3.  **Turso URL**: Paste your Turso database URL (e.g., `libsql://your-db.turso.io`).
4.  **Auth Token**: Paste your Turso Read/Write token.
5.  Tap **Generate Sharing Code**.

### To Join a Family Member:
1.  On the second device, go to **Settings** -> **Family Sync**.
2.  Enter the 6-character **Sharing Code** from the first device.
3.  Tap **Join Family Sync**.

---

## 🛠️ Troubleshooting

> [!WARNING]
> **Build Error?** If the GitHub build fails, make sure you have added the `SYNC_API_SECRET` to GitHub. The build will fail if this secret is missing.

> [!TIP]
> **Not Syncing?** ensure your Cloudflare variable is named exactly `API_KEY` (all caps) and your GitHub secret is named exactly `SYNC_API_SECRET`.

---
*Created by Antigravity AI Assistant*
