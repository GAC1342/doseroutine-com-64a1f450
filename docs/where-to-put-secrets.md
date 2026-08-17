# Where to put each Codemagic secret

Copy each line exactly. **Variable name** goes in the first box. **Variable value** goes in the second box.

---

## iOS build — add these 3 variables

**Where to go:**
Codemagic → Your DoseRoutine app → App settings → Environment variables → Group: `doseroutine_env`

Click **Add variable** 3 times.

### Variable 1 of 3

- **Group name:** `doseroutine_env`
- **Variable name:** `APP_STORE_CONNECT_ISSUER_ID`
- **Variable value:** your Issuer ID from App Store Connect
- **Secret:** ✅ check the Secret box

### Variable 2 of 3

- **Group name:** `doseroutine_env`
- **Variable name:** `APP_STORE_CONNECT_KEY_ID`
- **Variable value:** the 10-character **Key ID** shown next to your new key (example: `ABC123DEF4`)
- **Secret:** ✅ check the Secret box

### Variable 3 of 3

- **Group name:** `doseroutine_env`
- **Variable name:** `APP_STORE_CONNECT_PRIVATE_KEY`
- **Variable value:** the **entire contents** of the downloaded `.p8` file (starts with `-----BEGIN PRIVATE KEY-----`, ends with `-----END PRIVATE KEY-----`)
- **Secret:** ✅ check the Secret box

The `.p8` file looks like this. Paste **everything** including the first and last lines:

```text
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...
...
-----END PRIVATE KEY-----
```

### How to get these 3 values

1. Go to **App Store Connect → Users and Access → Integrations → App Store Connect API**.
2. Use the API key area that shows an **Issuer ID**. Do **not** use an **Individual API Key** if it does not show that same Issuer ID.
3. Click **+** to make a new key.
4. Set **Name** to anything you will recognize (for example: `DoseRoutine Codemagic`).
5. Set **Access** to **App Manager**.
6. Click **Download API Key**. This gives you the `.p8` file.
7. The screen now shows:
   - **Issuer ID** → paste into `APP_STORE_CONNECT_ISSUER_ID`
   - **Key ID** → paste into `APP_STORE_CONNECT_KEY_ID`
   - **Downloaded `.p8` file** → open in Text Edit, select all, copy, paste into `APP_STORE_CONNECT_PRIVATE_KEY`

> If Codemagic says **401**, the three saved values do not match each other. Revoke that Apple key, make a new **App Manager** key, download the new `.p8`, then replace **both** `APP_STORE_CONNECT_KEY_ID` and `APP_STORE_CONNECT_PRIVATE_KEY` in Codemagic.

> If Codemagic says **409**, **"already have a current Distribution certificate"**, or **"Did not find any Signing Certificates for given private key"**, do **not** change the `.p8`. That error is about the Apple Distribution certificate/private key, not the App Store Connect API key.

### If Apple says the Distribution certificate already exists

Use **one** of these two fixes:

**Best fix if you do not have the original Mac:**

1. Go to Apple Developer → **Certificates, IDs & Profiles → Certificates**.
2. Revoke the old unused **Apple Distribution / iOS Distribution** certificate or delete the pending certificate request.
3. Re-run Codemagic. If the build hit the mismatch error, the workflow now removes the stale cached signing key and creates one fresh stable key on the next run.

**Alternative fix if you have the Mac that originally made the certificate:**

1. On that Mac, open **Keychain Access**.
2. Find the **Apple Distribution** certificate for your Apple account.
3. Expand it and make sure it has a private key under it.
4. Right-click the certificate/private-key pair → **Export**.
5. Save it as a `.p12` file and set a password you will remember.
6. In Codemagic, go to **App settings → Code signing identities → iOS certificates**.
7. Upload that `.p12` file.
8. Then go to **iOS provisioning profiles** and fetch or upload an **App Store** profile for `com.doseroutine.app`.
9. Make sure the profile shows it is matched to the uploaded certificate.
10. Re-run the iOS build.

If Codemagic says **No matching profiles found**, upload or fetch the App Store profile first, then rerun. The YAML does **not** force this before the repair script runs.

Do **not** replace `APP_STORE_CONNECT_PRIVATE_KEY` for this 409/certificate-private-key error.

Optional advanced fix: if Codemagic app-specific certificate upload is not available on your account, save these in the `doseroutine_env` group instead:

- `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` = the exported `.p12` converted to base64 text
- `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` = the password you used when exporting the `.p12`
- `IOS_APP_STORE_PROVISIONING_PROFILE_BASE64` = the matching App Store `.mobileprovision` file converted to base64 text

Most people should use the Codemagic **Code signing identities** upload instead.

> **Important:** Apple only lets you download the `.p8` file **once**. If you lose it, revoke the key and make a new one.

---

## Android build — add these 2 variables

**Where to go:**
Codemagic → Your DoseRoutine app → App settings → Environment variables → Group: `google_play`

### Variable 1 of 2

- **Group name:** `google_play`
- **Variable name:** `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
- **Variable value:** the whole contents of your Google Play service-account `.json` file
- **Secret:** ✅ check the Secret box

### Variable 2 of 2

- **Group name:** `google_play`
- **Variable name:** `PACKAGE_NAME`
- **Variable value:** `com.doseroutine.app`
- **Secret:** ❌ do not check the Secret box

### How to get the Google Play JSON

The `.json` file comes from **Google Cloud Console**, not from Google Play Console directly. Here is the exact path:

1. Go to https://console.cloud.google.com
2. Make sure you are in the same Google Cloud project that is linked to your Google Play account.
3. In the top search bar, type **"Service accounts"** and open it.
4. Click **Create service account**.
   - **Name:** `doseroutine-play-publisher`
   - Click **Create and continue**.
5. Grant this role: **Service Accounts → Service Account User**.
6. Click **Done**.
7. Find the new service account in the list, click the **three dots** on the right, then click **Manage keys**.
8. Click **Add key → Create new key**.
9. Choose **JSON**, then click **Create**.
10. A `.json` file downloads automatically. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "doseroutine-play-publisher@...iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

11. Open that file in any text editor (Notepad, TextEdit, etc.), select all, copy.
12. Paste the whole thing into Codemagic:
    - **Group name:** `google_play`
    - **Variable name:** `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
    - **Variable value:** the copied JSON text
    - **Secret:** ✅ check the Secret box

### Then give that service account access to Google Play

1. Go to https://play.google.com/console
2. Open **DoseRoutine → Users and permissions**.
3. Click **Invite new users**.
4. Paste the **client_email** from the `.json` file (it ends in `@...iam.gserviceaccount.com`).
5. Set role to **Admin**.
6. Click **Invite user**.

---

## Android keystore — upload a file, not a secret

**Where to go:**
Codemagic → Your DoseRoutine app → App settings → Code signing identities → Android keystores

1. Click **Add keystore**.
2. Upload your `.keystore` or `.jks` file.
3. Set the **Reference name** to exactly: `doseroutine_keystore`
4. Fill in:
   - Keystore password
   - Key alias
   - Key password

If you do not have a keystore yet, create one on your Mac or PC:

```bash
keytool -genkey -v -keystore doseroutine.keystore -alias doseroutine -keyalg RSA -keysize 2048 -validity 10000
```

Then upload `doseroutine.keystore` in Codemagic.

---

## Checklist before you retry

- [ ] iOS: 3 secrets saved in group `doseroutine_env`
- [ ] iOS: each secret is marked **Secret** (hidden)
- [ ] iOS: the `.p8` contents include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- [ ] iOS `.p12` path only: uploaded Apple Distribution `.p12` in Code signing identities
- [ ] iOS `.p12` path only: uploaded/fetched App Store profile for `com.doseroutine.app`
- [ ] iOS manual env path only: if using `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, also set `IOS_APP_STORE_PROVISIONING_PROFILE_BASE64`
- [ ] Android: 2 secrets saved in group `google_play`
- [ ] Android: keystore uploaded with reference name `doseroutine_keystore`
- [ ] The `doseroutine_env` group is attached to the `ios-testflight` workflow
- [ ] The `google_play` group is attached to the `android-play` workflow

---

## Still failing?

Open the failed build step in Codemagic and look for lines that start with `FAIL`. The message tells you exactly which variable is missing.

Then come back to this page, find that variable above, and paste it in the right group.
