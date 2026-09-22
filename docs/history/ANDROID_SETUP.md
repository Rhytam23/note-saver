> **⚠ Superseded / historical record only — do not treat this as current.**
>
> Superseded by [docs/SETUP.md](../SETUP.md), which has the same steps kept up to date. Kept here as-is for history.
>
> Moved here unmodified on 2026-09-22 so the reasoning trail isn't lost.

---

# Android Deployment Guide: NoteNirman

This guide outlines the steps to build, test, and deploy the NoteNirman Android application using Capacitor and Android Studio.

## Prerequisites
1.  **Android Studio**: Ensure you have the latest version installed.
2.  **SDK Tools**: Install Android SDK Platform 33+ and Android SDK Build-Tools.

## Build and Sync Process

### 1. Build Web Assets
Ensure your latest changes are compiled into the `dist/` folder:
```bash
npm run build
```

### 2. Sync with Android
Synchronize the web assets with the native Android project:
```bash
npx cap sync android
```

### 3. Open in Android Studio
Launch Android Studio with the project context:
```bash
npx cap open android
```

## Creating a Signed Bundle (.aab) for Play Store

1.  In Android Studio, go to **Build > Generate Signed Bundle / APK...**
2.  Select **Android App Bundle** and click **Next**.
3.  **Key Store Path**: Create a new key store if you don't have one. **Keep this file and password safe!** Loss of this key means you cannot update your app in the future.
4.  **Build Variant**: Select `release`.
5.  **V1/V2 Signing**: Ensure both are checked if applicable.
6.  Click **Finish**. The generated `.aab` file will be in `app/android/app/release/`.

## Local Testing (APK)
To test on a physical device without the Play Store:
1.  Connect your device via USB (ensure Developer Options and USB Debugging are on).
2.  In Android Studio, click the **Run** button (green play icon).
3.  Alternatively, use **Build > Build APK(s)** to generate a debug `.apk` file you can manually install.

---
**Troubleshooting**: If you encounter gradle errors, try **File > Invalidate Caches / Restart** in Android Studio.
