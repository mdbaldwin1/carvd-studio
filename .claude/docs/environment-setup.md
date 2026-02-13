# Environment Configuration Guide

This document lists all environment variables and secrets needed for each deployment target.

---

## 1. GitHub (CI/CD)

**Location:** Repository → Settings → Secrets and variables → Actions → Secrets

### Required for Tests
| Secret | Description | How to Get |
|--------|-------------|------------|
| `LICENSE_PRIVATE_KEY` | RSA private key for test license generation | Run `npm run generate-keys` locally, copy contents of `license-private-key.pem` |

### Required for Release Builds (macOS Code Signing)
| Secret | Description | How to Get | Status |
|--------|-------------|------------|--------|
| `CSC_LINK` | Base64-encoded .p12 certificate | Export from Keychain, then `base64 -i cert.p12` | ✅ Configured |
| `CSC_KEY_PASSWORD` | Password for the .p12 file | Set when exporting | ✅ Configured |

**Note:** The release workflow creates a custom keychain, imports the certificate along with Apple intermediate certificates (DeveloperIDG2CA.cer and DeveloperIDCA.cer), and passes it to electron-builder via `CSC_KEYCHAIN`.

### Required for macOS Notarization
| Secret | Description | How to Get | Status |
|--------|-------------|------------|--------|
| `APPLE_ID` | Your Apple Developer email | Apple Developer account | ✅ Configured |
| `APPLE_ID_PASSWORD` | App-specific password | appleid.apple.com → Security → App-Specific Passwords | ✅ Configured |
| `APPLE_TEAM_ID` | 10-character team ID | developer.apple.com → Membership | ✅ Configured |

**Note:** Notarization runs automatically via the `afterSign` hook in electron-builder, which calls `scripts/notarize.cjs`. The script uses `@electron/notarize` with `notarytool` to submit the app to Apple. The release workflow passes the Apple credentials as environment variables.

### Optional for Release Builds (Windows)
| Secret | Description | How to Get | Status |
|--------|-------------|------------|--------|
| `WINDOWS_CERTIFICATE` | Base64-encoded code signing cert | Purchase from CA (Sectigo, DigiCert, etc.) | Not configured |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the certificate | Set when exporting | Not configured |

### Required for Auto-Updating Website Version
| Secret | Description | How to Get | Status |
|--------|-------------|------------|--------|
| `VERCEL_TOKEN` | Vercel API token | vercel.com → Settings → Tokens → Create | ✅ Configured |
| `VERCEL_ORG_ID` | Your Vercel organization/team ID | Vercel Dashboard → Settings → General → Team ID, or `.vercel/project.json` | ✅ Configured |
| `VERCEL_PROJECT_ID` | Your website project ID | Vercel Dashboard → Project → Settings → General → Project ID | ✅ Configured |

When all three are configured, the release workflow automatically updates `VITE_APP_VERSION` in Vercel after creating a release, then triggers a production redeploy via the Vercel API so the website immediately reflects the new version.

### Vercel Build Behavior

The website's `vercel.json` has an `ignoreCommand` that only allows builds from `main` (non-main pushes are skipped). This means:
- PR preview deploys are skipped (Vercel shows "Canceled by Ignored Build Step")
- Only merges/pushes to `main` trigger production builds
- The release workflow's redeploy step handles the case where the env var is updated after the main-branch build

---

## 2. Vercel (Website)

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_LEMON_SQUEEZY_CHECKOUT_URL` | Lemon Squeezy checkout link | `https://yourstore.lemonsqueezy.com/checkout/buy/abc123` |
| `VITE_GITHUB_REPO` | GitHub repo for download URLs | `mdbaldwin1/carvd-studio` |
| `VITE_APP_VERSION` | Current app version | `1.0.0` |

**How to get checkout URL:**
1. Lemon Squeezy Dashboard → Products → Your Product
2. Click "Share"
3. Copy the "Checkout Link"

---

## 3. Desktop App (Local Development)

The desktop app doesn't require environment variables for normal development.

### Optional: Test License Key

For testing license features without a real purchase:

```bash
# In packages/desktop directory
npm run generate-test-license
```

This outputs a test license key. Use `DEV-TEST-LICENSE-KEY` in development mode for unlimited testing.

### Optional: Local License Key File

If you need to generate test licenses, create `license-private-key.pem` in the desktop package:

```bash
npm run generate-keys
```

**Note:** This file is gitignored - never commit private keys.

---

## Quick Setup Checklist

### Minimum for CI/CD (tests only)
- [ ] `LICENSE_PRIVATE_KEY` in GitHub Secrets

### Minimum for Website
- [ ] `VITE_LEMON_SQUEEZY_CHECKOUT_URL` in Vercel
- [ ] `VITE_GITHUB_REPO` in Vercel
- [ ] `VITE_APP_VERSION` in Vercel (auto-updated by release workflow if VERCEL_TOKEN is set)

### Full Release Pipeline
- [x] `LICENSE_PRIVATE_KEY` in GitHub Secrets
- [x] `CSC_LINK` + `CSC_KEY_PASSWORD` in GitHub Secrets (macOS code signing)
- [x] `APPLE_ID` + `APPLE_ID_PASSWORD` + `APPLE_TEAM_ID` in GitHub Secrets (macOS notarization)
- [x] `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` in GitHub Secrets
- [x] `VERCEL_ORG_ID` in GitHub Secrets (required for Vercel version update)
- [ ] All Vercel env vars above
- [ ] Lemon Squeezy product configured with license keys enabled
- [ ] (Optional) Windows code signing certificate

---

## Local Development Files

These files are used locally and gitignored:

| File | Location | Purpose |
|------|----------|---------|
| `license-private-key.pem` | `packages/desktop/` | Generate test licenses |
| `.env` | `packages/website/` | Local website development |

### Example `packages/website/.env`:
```bash
VITE_LEMON_SQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/abc123
VITE_GITHUB_REPO=mdbaldwin1/carvd-studio
VITE_APP_VERSION=1.0.0
```
