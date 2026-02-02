# Your TODO Checklist - Automation Setup

This document lists everything **you** need to do/gather to enable full automation. Check off items as you complete them.

---

## Phase 1: Vercel Deployment Setup

### Website Deployment

- [ ] **Connect Vercel to GitHub repository**
  - Go to: https://vercel.com/new
  - Click "Import Git Repository"
  - Select `carvd-studio` repository
  - Click "Import"

- [ ] **Configure Website Project in Vercel**
  - Project name: `carvd-studio-website` (or your preference)
  - Root Directory: `packages/website`
  - Framework Preset: (Auto-detect or select your framework)
  - Build Command: `npm run build --workspace=@carvd/website`
  - Output Directory: `.next` or `dist` (depends on your framework)
  - Install Command: `npm ci`
  - Node.js Version: `20.x`

- [ ] **Add Environment Variables in Vercel** (if website needs any)
  - Go to Project Settings → Environment Variables
  - Add any required env vars for website
  - Examples might include:
    - `NEXT_PUBLIC_API_URL`
    - `NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID`
    - Any public-facing variables

- [ ] **Configure Custom Domain** (optional)
  - Go to Project Settings → Domains
  - Add your domain (e.g., `carvd.com`)
  - Update DNS records as instructed by Vercel
  - Wait for DNS propagation

- [ ] **Test Website Deployment**
  - Push a commit to main branch
  - Verify deployment succeeds in Vercel dashboard
  - Visit production URL and verify site works
  - Create a PR and verify preview deployment works

---

### Webhook Deployment

- [ ] **Create Separate Vercel Project for Webhook**
  - Go to: https://vercel.com/new
  - Import same repository (`carvd-studio`)
  - This will be a second project

- [ ] **Configure Webhook Project in Vercel**
  - Project name: `carvd-studio-webhook`
  - Root Directory: `packages/webhook`
  - Framework Preset: Other
  - Build Command: (leave empty - serverless function)
  - Output Directory: (leave empty)
  - Install Command: `npm ci`
  - Node.js Version: `20.x`

- [ ] **Add Environment Variables for Webhook**
  - Go to Project Settings → Environment Variables
  - Add the following (REQUIRED):
    - `LICENSE_PRIVATE_KEY` = (paste contents of `license-private-key.pem`)
    - `LEMON_SQUEEZY_WEBHOOK_SECRET` = (get from Lemon Squeezy - see below)
    - `NODE_ENV` = `production`

- [ ] **Get Webhook URL from Vercel**
  - After deployment, copy the production URL
  - Format: `https://carvd-studio-webhook.vercel.app/api/webhook`
  - Save this URL - you'll need it for Lemon Squeezy

- [ ] **Test Webhook Deployment**
  - Push a commit that touches `packages/webhook/`
  - Verify deployment succeeds
  - Use `packages/webhook/test-webhook.js` to test locally first

---

## Phase 2: Lemon Squeezy Configuration

### API Access

- [ ] **Get Lemon Squeezy API Key**
  - Log into Lemon Squeezy dashboard
  - Go to: Settings → API
  - Click "Create API Key"
  - Name: "GitHub Actions Release Automation"
  - Copy the API key (save securely - you'll add to GitHub Secrets)
  - ✅ **Save this:** `LEMON_SQUEEZY_API_KEY`

- [ ] **Get Store ID**
  - In Lemon Squeezy dashboard
  - Go to Settings → Stores
  - Copy your Store ID (numeric)
  - ✅ **Save this:** `LEMON_SQUEEZY_STORE_ID`

### Product Setup

- [ ] **Create/Find Carvd Studio Product**
  - If not already created:
    - Go to Products → Create Product
    - Name: "Carvd Studio"
    - Type: Digital product
  - Copy the Product ID from URL or API
  - ✅ **Save this:** `LEMON_SQUEEZY_PRODUCT_ID`

- [ ] **Create Product Variants**
  - Create variant for macOS:
    - Name: "Carvd Studio for macOS"
    - Platform: macOS
  - Create variant for Windows:
    - Name: "Carvd Studio for Windows"
    - Platform: Windows
  - Copy both Variant IDs
  - ✅ **Save these:**
    - `LEMON_SQUEEZY_VARIANT_ID_MACOS`
    - `LEMON_SQUEEZY_VARIANT_ID_WINDOWS`

### Webhook Setup

- [ ] **Configure Webhook in Lemon Squeezy**
  - Go to Settings → Webhooks
  - Click "Create Webhook"
  - **URL:** (Vercel webhook URL from above)
  - **Events:** Select `order_created`
  - **Signing secret:** Copy the secret that's generated
  - Click "Create"
  - ✅ **Save this:** `LEMON_SQUEEZY_WEBHOOK_SECRET` (add to Vercel env vars if not done)

- [ ] **Test Webhook**
  - In Lemon Squeezy webhook settings, click "Send Test Event"
  - Check Vercel logs to verify webhook received
  - Should see successful license generation in logs

---

## Phase 3: Apple Developer Setup (macOS Code Signing)

### Apple Developer Account

- [ ] **Enroll in Apple Developer Program** (if not already)
  - Go to: https://developer.apple.com/programs/enroll/
  - Cost: $99/year
  - Wait for approval (can take 1-2 days)

- [ ] **Get Team ID**
  - Log into https://developer.apple.com/account
  - Go to Membership
  - Copy Team ID (looks like: `ABCDE12345`)
  - ✅ **Save this:** `APPLE_TEAM_ID`

### Code Signing Certificate

- [ ] **Create Developer ID Application Certificate**
  - On your Mac, open Keychain Access
  - Menu: Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
  - Enter your email, select "Saved to disk"
  - Save the CSR file

- [ ] **Upload CSR to Apple Developer**
  - Go to: https://developer.apple.com/account/resources/certificates/add
  - Select: "Developer ID Application"
  - Upload your CSR file
  - Download the certificate (.cer file)

- [ ] **Import Certificate to Keychain**
  - Double-click the downloaded .cer file
  - It will be added to your login keychain
  - Find it in Keychain Access

- [ ] **Export Certificate as .p12**
  - In Keychain Access, find your certificate
  - Right-click → Export
  - File format: Personal Information Exchange (.p12)
  - Set a password (remember this!)
  - Save as `apple-certificate.p12`

- [ ] **Convert .p12 to Base64**
  - Open Terminal, run:
    ```bash
    base64 -i apple-certificate.p12 -o apple-certificate-base64.txt
    ```
  - ✅ **Save the contents of this file:** `CSC_LINK`
  - ✅ **Save the password you set:** `CSC_KEY_PASSWORD`

### App-Specific Password (for Notarization)

- [ ] **Generate App-Specific Password**
  - Go to: https://appleid.apple.com/account/manage
  - Sign in with your Apple ID
  - Under "Security" → "App-Specific Passwords"
  - Click "Generate Password"
  - Label: "Carvd Studio Notarization"
  - Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)
  - ✅ **Save this:** `APPLE_ID_PASSWORD`

- [ ] **Confirm Apple ID Email**
  - ✅ **Save this:** `APPLE_ID` (your Apple ID email)

---

## Phase 4: Windows Code Signing (Optional but Recommended)

### Code Signing Certificate

- [ ] **Purchase Code Signing Certificate** (if you want to sign Windows builds)
  - Providers: DigiCert, Sectigo, SSL.com
  - Type: "Code Signing Certificate" or "EV Code Signing Certificate"
  - Cost: $200-500/year
  - EV certificates bypass SmartScreen warnings immediately

- [ ] **Download Certificate as .pfx**
  - Follow provider's instructions to download
  - Save as `windows-certificate.pfx`

- [ ] **Convert .pfx to Base64**
  - Open PowerShell or Terminal, run:
    ```bash
    # Windows PowerShell
    [Convert]::ToBase64String([IO.File]::ReadAllBytes("windows-certificate.pfx")) > windows-certificate-base64.txt

    # macOS/Linux
    base64 -i windows-certificate.pfx -o windows-certificate-base64.txt
    ```
  - ✅ **Save the contents of this file:** `WINDOWS_CERTIFICATE`
  - ✅ **Save the certificate password:** `WINDOWS_CERTIFICATE_PASSWORD`

### Skip Windows Signing?

- [ ] **Decision: Sign Windows builds?**
  - **If YES:** Complete steps above
  - **If NO:** Skip this phase - builds will be unsigned
    - ⚠️ Users will see "Unknown Publisher" warnings
    - ⚠️ Windows SmartScreen may block download initially

---

## Phase 5: Add GitHub Secrets

- [ ] **Go to GitHub Repository Settings**
  - Open: https://github.com/your-username/carvd-studio/settings/secrets/actions
  - Click "New repository secret" for each item below

### Lemon Squeezy Secrets

- [ ] Add `LEMON_SQUEEZY_API_KEY`
- [ ] Add `LEMON_SQUEEZY_STORE_ID`
- [ ] Add `LEMON_SQUEEZY_PRODUCT_ID`
- [ ] Add `LEMON_SQUEEZY_VARIANT_ID_MACOS`
- [ ] Add `LEMON_SQUEEZY_VARIANT_ID_WINDOWS`

### Apple Secrets

- [ ] Add `APPLE_ID` (your Apple ID email)
- [ ] Add `APPLE_ID_PASSWORD` (app-specific password)
- [ ] Add `APPLE_TEAM_ID` (team ID from developer portal)
- [ ] Add `CSC_LINK` (base64-encoded .p12 certificate)
- [ ] Add `CSC_KEY_PASSWORD` (password for .p12)

### Windows Secrets (if signing)

- [ ] Add `WINDOWS_CERTIFICATE` (base64-encoded .pfx)
- [ ] Add `WINDOWS_CERTIFICATE_PASSWORD`

### Already Configured ✅

- [x] `LICENSE_PRIVATE_KEY` (already added for tests)

---

## Phase 6: Electron Builder Configuration

- [ ] **Review `electron-builder.yml`** (or `package.json` build config)
  - Ensure it's configured for macOS and Windows builds
  - Verify output formats (DMG for macOS, NSIS for Windows)
  - Check that app metadata is correct (name, version, etc.)

- [ ] **Provide me with the following info:**
  - [ ] Does `packages/desktop/package.json` have build scripts?
    - `package:mac` - Package for macOS?
    - `package:win` - Package for Windows?
  - [ ] If not, I'll need to add these scripts

---

## Phase 7: Testing & Validation

- [ ] **Test Website Deployment**
  - [ ] Push to main → verify website updates
  - [ ] Create PR → verify preview deployment

- [ ] **Test Webhook Deployment**
  - [ ] Push to main → verify webhook updates
  - [ ] Send test webhook from Lemon Squeezy → verify license generation

- [ ] **Test Release Process** (once I implement release.yml)
  - [ ] Create test tag: `git tag v1.0.0-beta`
  - [ ] Push tag: `git push origin v1.0.0-beta`
  - [ ] Verify builds complete in GitHub Actions
  - [ ] Verify files appear on Lemon Squeezy
  - [ ] Verify GitHub Release is created
  - [ ] Download builds and test installation

---

## Phase 8: Auto-Update System

### Understanding Auto-Updates

- [ ] **Review auto-update strategy** in `.claude/docs/06-automation-strategy.md`
  - Understand how electron-updater works
  - Understand the update flow for users
  - Understand why we use GitHub Releases

### Setup (I'll implement this after release workflow)

Nothing for you to do in this phase! Once the release workflow is working, I'll:

- [ ] Install `electron-updater` package
- [ ] Configure electron-builder for GitHub Releases publishing
- [ ] Add update checking code to main process
- [ ] Add update notification UI to renderer
- [ ] Test auto-updates with beta releases

### User Experience

When auto-updates are working, your users will:
1. Launch the app as normal
2. App checks for updates in background (every 6 hours)
3. If update available, downloads silently
4. User sees notification: "Update v1.2.0 ready - Restart to install"
5. User clicks button, app restarts with new version
6. License stays activated - no re-entry needed

### Notes

- ✅ **GitHub Releases** hosts update files (free, fast CDN)
- ✅ **Lemon Squeezy** hosts initial downloads for new purchases
- ✅ **Code signing** required for seamless updates (macOS & Windows)
- ✅ **License preserved** across updates - users don't need to re-activate
- ✅ **Privacy-friendly** - no user tracking, just version checks

---

## Summary Checklist

Quick overview of what you need to gather:

### Accounts & Services
- [ ] Vercel account (free)
- [ ] Apple Developer account ($99/year)
- [ ] (Optional) Windows code signing certificate ($200-500/year)

### Credentials to Save
- [ ] Lemon Squeezy API key
- [ ] Lemon Squeezy Store ID, Product ID, Variant IDs
- [ ] Apple ID email
- [ ] Apple ID app-specific password
- [ ] Apple Team ID
- [ ] Apple certificate (.p12 base64)
- [ ] Apple certificate password
- [ ] (Optional) Windows certificate (.pfx base64)
- [ ] (Optional) Windows certificate password

### Configurations to Complete
- [ ] Vercel website deployment
- [ ] Vercel webhook deployment
- [ ] Lemon Squeezy webhook
- [ ] GitHub Secrets (all credentials)

---

## When You're Ready

Once you've completed the checklist above, let me know and I'll:

1. ✅ Implement the release workflow (`.github/workflows/release.yml`)
2. ✅ Add any missing build scripts to `package.json`
3. ✅ Configure Electron Builder for proper packaging
4. ✅ Implement auto-update system with electron-updater
5. ✅ Add update notification UI to the app
6. ✅ Create version bump helper scripts
7. ✅ Set up changelog generation
8. ✅ Test the full release process with auto-updates

---

## Questions?

If you're stuck on any step, just ask! I can:
- Help you find the right settings in Lemon Squeezy
- Guide you through certificate generation
- Troubleshoot Vercel deployment issues
- Explain any step in more detail

---

**Created:** 2026-02-02
**Status:** Awaiting your setup
