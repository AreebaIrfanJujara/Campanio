# Companio Android APK & Auto-Update Guide

This guide explains how to generate an **Android APK** for **Companio** and how to configure **Auto-Updates** so whenever you change/update your code, the app on your mobile phone updates automatically without needing to reinstall the APK!

---

## 🚀 Option 1: Live Server URL (Auto-Updates Automatically 100%)

By pointing Capacitor's native container to your live hosted website (e.g. Vercel, Netlify, Render, or your local Wi-Fi IP address), **every single code update you make automatically displays on your mobile device instantly!**

### Step 1: Set your Live URL in `capacitor.config.ts`
Open `capacitor.config.ts` and set `url` inside `server`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.companio.app',
  appName: 'Companio',
  webDir: 'out',
  server: {
    // 💡 Replace with your live web app URL or local IP address:
    url: 'https://companio.vercel.app', // OR 'http://192.168.1.X:3000'
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
```

### Step 2: Sync and Build APK
Run in your terminal:
```bash
npm run cap:sync
npm run apk:build
```
The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Option 2: Instant PWA Mobile Installation (No APK compilation needed!)

Companio is already a fully configured Progressive Web App (PWA).

1. Deploy your app to Vercel/Netlify or access it via your local Wi-Fi address (`http://192.168.X.X:3000`).
2. Open the link on your mobile phone (Chrome on Android or Safari on iOS).
3. Tap **"Add to Home Screen"** or **"Install App"** (or use the top bar Install button inside Companio).
4. **Auto-Update behavior**: Whenever you push code updates to Vercel/Netlify, opening the installed app on your mobile phone automatically loads the newest version!

---

## 🔨 Useful Terminal Commands

- **Sync project assets**: `npm run cap:sync`
- **Build Android APK**: `npm run apk:build`
- **Open in Android Studio**: `npm run cap:open`
