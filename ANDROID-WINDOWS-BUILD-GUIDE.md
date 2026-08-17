# DoseRoutine — Android Build Guide for Windows

Use this guide to build the Android `.aab` (Google Play upload file) on your Windows machine.

## 1. Install prerequisites

### Android Studio

1. Download from https://developer.android.com/studio
2. Run the installer with default options.
3. Open Android Studio → More Actions → SDK Manager.
4. Install:
   - **Android SDK Platform 34** (or whatever `compileSdkVersion` is in `android/app/build.gradle`)
   - **Android SDK Build-Tools** (latest)
   - **Android SDK Command-line Tools**
   - **Android Emulator + Hyper-V/Intel HAXM** (optional, for testing)

### Java JDK 17

1. Download Eclipse Temurin JDK 17 from https://adoptium.net/
2. Install with defaults.
3. Set environment variables:
   - `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17...`
   - Add `%JAVA_HOME%\bin` to your `Path`
4. Verify in Command Prompt:
   ```
   java -version
   ```

### Node.js

1. Download LTS from https://nodejs.org/
2. Verify:
   ```
   node -v
   npm -v
   ```

## 2. Prepare the project

Open Command Prompt or PowerShell in the project folder (the one containing `package.json`, `capacitor.config.ts`, and `android/` folder).

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Sync web build into the Android project
npx cap sync android
```

If you see errors about missing Android SDK paths, set them:

```bash
setx ANDROID_SDK_ROOT "C:\Users\YOURNAME\AppData\Local\Android\Sdk"
```

Then restart your terminal.

## 3. Build the Android App Bundle (.aab)

```bash
npx cap open android
```

This opens Android Studio. Then:

1. In Android Studio, wait for Gradle sync to finish.
2. Go to **Build → Generate Signed App Bundle / APK...**
3. Select **Android App Bundle (.aab)** → **Next**
4. Create or select a keystore:
   - If you don't have one, click **Create new...**
   - Save it somewhere safe (e.g., `C:\doseroutine-keystore.jks`)
   - Remember the password and alias — you need this for every update
5. Choose **release** build variant.
6. Click **Finish**.

Android Studio builds `android/app/release/app-release.aab`.

## 4. Upload to Google Play Console

1. Go to https://play.google.com/console
2. Open your DoseRoutine app.
3. Go to **Production → Create new release** (or **Testing → Closed testing** if you want a test track first).
4. Upload the `.aab` file.
5. Save and review.

## 5. Set up RevenueCat for Android

Before users can subscribe on Android, you need:

1. In RevenueCat → **Project settings → API keys**
2. Copy the Google Play key (starts with `goog_`)
3. Paste it into the secure form I provide, or add it as `REVENUECAT_GOOGLE_KEY` in project secrets.
4. In Google Play Console → **Monetization setup**, link your Google Cloud project and create subscription products matching the RevenueCat offering.

## 6. Test on your own Android phone (optional)

```bash
npx cap run android
```

This builds a debug APK and installs it on a connected phone with USB debugging enabled.

---

**Next:** Do you want me to also create a no-Mac iOS build guide using Codemagic or MacStadium?
