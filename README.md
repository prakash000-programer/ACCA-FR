# ACCA FR Mastery — Android App

A full-stack mobile learning app for ACCA FR students built with TanStack Start + Capacitor + Supabase.

## 🔐 GitHub Secrets Setup (Required for APK Build)

Before the GitHub Action can build a signed APK, you must add the following secrets to your repository.

**Go to:** `https://github.com/prakash000-programer/ACCA-FR/settings/secrets/actions`

| Secret Name | Value |
|---|---|
| `KEYSTORE_BASE64` | *(see below)* |
| `KEY_STORE_PASSWORD` | `accafr@2024` |
| `KEY_ALIAS` | `accafr-key` |
| `KEY_PASSWORD` | `accafr@2024` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

### How to get KEYSTORE_BASE64

The keystore file is stored locally at `acca-fr-release.keystore` (generated but not committed). To regenerate and get the Base64 value:

```powershell
# Generate keystore (run once)
& "C:\Program Files\Java\jdk-17\bin\keytool.exe" -genkey -v `
  -keystore acca-fr-release.keystore `
  -alias accafr-key -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "accafr@2024" -keypass "accafr@2024" `
  -dname "CN=ACCA FR Mastery, OU=Mobile App, O=ACCA FR, L=India, S=India, C=IN"

# Get Base64 value (copy this into the KEYSTORE_BASE64 secret)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("acca-fr-release.keystore"))
```

> **IMPORTANT:** Store the keystore file and passwords somewhere safe (e.g., a password manager). If you lose the keystore, you cannot update the app on the same signature.

## 🚀 Building the APK via GitHub Actions

1. Push to `main` branch — the workflow triggers automatically.
2. Go to `Actions` tab → `Build Android APK` → latest run.
3. Download the APK from the **Artifacts** section at the bottom of the run.

## 📱 Features

- Device fingerprinting on `/verify` route — each account is locked to one device
- Screenshot protection on PDF pages (`FLAG_SECURE`)
- Biometric/device authentication via Android hardware
- PDF viewer with AI Tutor, quiz linking, and discussion threads
- Admin panel for content/quiz management

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start web dev server
npm run dev

# Build for production
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```
