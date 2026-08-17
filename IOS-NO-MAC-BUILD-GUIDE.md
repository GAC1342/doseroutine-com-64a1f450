# DoseRoutine — iOS Build Without a Mac (Windows-Friendly Guide)

You do not own a Mac. You can still build, sign, and ship the iOS app to the App Store from your Windows PC using a cloud CI service. This guide uses **Codemagic** (easiest, free tier covers our needs). Alternatives listed at the end.

Estimated time end-to-end: **90–120 minutes** the first time, ~10 minutes for every future build.

---

## What you need before starting

Have these open in browser tabs:

1. **Apple Developer account** (paid, you already have it) — https://developer.apple.com
2. **App Store Connect** — https://appstoreconnect.apple.com — your DoseRoutine app record already exists
3. **GitHub account** — free — https://github.com
4. **Codemagic account** — free — sign up with GitHub at https://codemagic.io

You will NOT need Xcode, a Mac, or any Apple software installed locally.

---

## STEP 1 — Push your project to GitHub (10 min)

Codemagic builds from a Git repo. If your DoseRoutine code is already on GitHub, skip to Step 2.

1. In GitHub, click **New repository** → name it `doseroutine` → **Private** → **Create**.
2. On your Windows PC, install **GitHub Desktop**: https://desktop.github.com (easier than command line).
3. Open GitHub Desktop → **File → Add Local Repository** → pick your DoseRoutine project folder.
4. It will say "not a git repo" → click **create a repository** → click **Publish repository** → uncheck "Keep this code private" only if you want it public (keep it private).
5. Done. Your code is now on GitHub.

---

## STEP 2 — Create Apple API keys Codemagic will use to sign & upload (10 min)

Codemagic needs permission to sign your app and push it to App Store Connect on your behalf.

1. Go to https://appstoreconnect.apple.com → **Users and Access** → **Integrations** tab → **App Store Connect API**.
2. Click **Generate API Key** (or the **+** button).
   - Name: `Codemagic`
   - Access: **Admin**
   - Click **Generate**.
3. It shows a row with:
   - **Issuer ID** (top of page — long UUID) → copy it, save in Notepad
   - **Key ID** (the row you just made) → copy it, save in Notepad
   - **Download API Key** button → click once → saves a file called `AuthKey_XXXXXX.p8`

   ⚠️ Apple only lets you download this ONE TIME. Save the `.p8` file somewhere safe (like `Documents/AppleKeys/`).

You now have 3 things: Issuer ID, Key ID, and the `.p8` file. Keep them for Step 4.

---

## STEP 3 — Create your Codemagic project (5 min)

1. Go to https://codemagic.io → sign in with GitHub → **Authorize Codemagic**.
2. Click **Add application** → pick GitHub → find `doseroutine` → **Finish: add application**.
3. Pick project type: **Capacitor** → **Continue**.
4. You land on the workflow editor. Leave defaults for now.

---

## STEP 4 — Connect your Apple account inside Codemagic (5 min)

1. In Codemagic, top-right click your avatar → **Teams** → **Personal Account** → **Integrations**.
2. Find **Developer Portal** → click **Connect**.
3. Paste in:
   - **Issuer ID** (from Step 2)
   - **Key ID** (from Step 2)
   - **API key** → upload the `AuthKey_XXXXXX.p8` file
4. Click **Save**. Green checkmark = working.

---

## STEP 5 — Configure the iOS workflow (10 min)

1. Back in your `doseroutine` app in Codemagic → click **Workflow Editor**.
2. Set:
   - **Build for platforms:** iOS
   - **Mode:** Release
   - **Xcode version:** Latest stable
   - **Node version:** 20 (or Latest LTS)
3. Under **Build → Build arguments**, add these commands to run before the iOS build:
   ```
   npm install
   npm run build
   npx cap sync ios
   ```
4. Under **Distribution → iOS code signing**:
   - Toggle **Enable automatic code signing** ON
   - **Provisioning profile type:** App Store
   - **Bundle identifier:** `com.doseroutine.app`
   - **Team:** select your Apple team from the dropdown (it appears because Step 4 connected it)
5. Under **Distribution → App Store Connect**:
   - Toggle ON
   - Pick the Developer Portal API key you saved in Step 4
   - **Submit to TestFlight:** ON
   - Leave **Submit to App Store review** OFF for the first build (you'll do that manually in App Store Connect after testing)
6. Click **Save changes**.

---

## STEP 6 — Run your first build (15–25 min)

1. Click **Start new build** (top right).
2. Pick branch `main` → **Start new build**.
3. Watch the log. First build takes 15–25 minutes because Codemagic sets up macOS, installs Xcode dependencies, and builds your app.
4. When it finishes green:
   - The `.ipa` is auto-uploaded to App Store Connect
   - You'll get an email from Apple within ~10 minutes: **"DoseRoutine has completed processing"**

---

## STEP 7 — Submit to TestFlight & App Review (5 min)

1. Go to https://appstoreconnect.apple.com → **My Apps → DoseRoutine → TestFlight**.
2. You'll see the new build. Click it → fill in:
   - **Export Compliance:** Does your app use encryption? → Standard HTTPS only → **No**
   - **Beta App Description:** short summary
3. Add yourself as an **Internal Tester** → install TestFlight on your iPhone → test the build.
4. When ready to submit for App Store review:
   - Go to **App Store** tab → **iOS App 1.0** → scroll to **Build** → click **+ Add Build** → pick your uploaded build → **Save** → **Add for Review** → **Submit for Review**.

You're live. Apple reviews in 24–48 hours typically.

---

## Cost breakdown

- **Codemagic free tier:** 500 build minutes/month on macOS M2. Each iOS build ≈ 15 min. You get ~30 free builds/month. More than enough.
- If you exceed: $0.095/min or $95/month unlimited.

---

## Alternatives if Codemagic doesn't work for you

| Service            | Cost                       | Notes                                                                                            |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------ |
| **Expo EAS Build** | Free tier: 30 builds/month | Best if you convert to Expo later. Works with Capacitor via custom build config but less native. |
| **Bitrise**        | 300 min/month free         | More complex UI, industry standard for larger teams.                                             |
| **MacinCloud**     | $30/month                  | Full remote Mac desktop. Good if you want to use Xcode directly.                                 |
| **AWS EC2 Mac**    | ~$1/hr, 24-hr minimum      | Overkill for one app.                                                                            |

---

## Troubleshooting

**Build fails at `npx cap sync ios`:** your `ios/` folder isn't committed. Run `npx cap add ios` locally on Windows, commit the `ios/` folder to GitHub, push, rebuild.

**"No matching provisioning profiles":** double-check bundle ID is exactly `com.doseroutine.app` in Codemagic AND in App Store Connect. Case-sensitive.

**"Missing compliance" in TestFlight:** answer the encryption question inside App Store Connect (Step 7, item 2).

**Build succeeds but not uploaded:** re-check Step 4 — the API key integration must be connected before the build runs.

---

## Summary of what you'll do

1. Push code to GitHub (10 min, one-time)
2. Create Apple API key (10 min, one-time)
3. Connect Codemagic to GitHub + Apple (10 min, one-time)
4. Configure workflow (10 min, one-time)
5. Run build → auto-uploads to TestFlight (25 min first time, ~10 min after)
6. Submit from App Store Connect (5 min)

Total first-time: ~70 minutes of your active work + ~25 minutes of Codemagic building in the background.

Every future update: push code to GitHub → click **Start new build** → done.
