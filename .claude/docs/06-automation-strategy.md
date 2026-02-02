# Automation Strategy - Carvd Studio

## Vision

**Zero-touch deployment:** From code commit to customer delivery, everything is automated.

## Automation Goals

✅ **Automated Testing** - Every push runs full test suite
✅ **Automated Website Deployment** - Push to main → live on Vercel
✅ **Automated Webhook Deployment** - Webhook changes → live on Vercel
✅ **Automated Desktop Releases** - Tag a version → signed builds on Lemon Squeezy
✅ **Version Management** - Consistent versioning across all packages
✅ **Changelog Generation** - Automatic release notes from commits

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
├─────────────────────────────────────────────────────────────┤
│  1. Make changes                                            │
│  2. Commit & push to branch                                 │
│  3. Create PR to main                                       │
│     ├─> Tests run automatically (test.yml)                 │
│     ├─> Vercel creates preview deployments                 │
│     └─> Await approval                                     │
│  4. Merge to main                                           │
│     ├─> Tests run on main                                  │
│     ├─> Website deploys to production (Vercel)            │
│     └─> Webhook deploys to production (Vercel)            │
│  5. Ready for release?                                      │
│     ├─> Bump version in package.json files                │
│     ├─> Create git tag (v1.2.0)                           │
│     ├─> Push tag                                          │
│     └─> Release workflow triggers (release.yml)           │
│         ├─> Build & sign desktop app (all platforms)      │
│         ├─> Upload to Lemon Squeezy                       │
│         ├─> Create GitHub Release                         │
│         └─> Generate changelog                            │
│  6. Done! Customers receive update                         │
└─────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. Test Workflow ✅ (Implemented)

**File:** `.github/workflows/test.yml`
**Trigger:** Push/PR to `main` or `develop`
**Purpose:** Run all tests to ensure code quality

**Jobs:**
- **unit-tests:** Vitest tests on Ubuntu, macOS, Windows
- **e2e-tests:** Playwright E2E tests on Ubuntu, macOS
- **lint:** ESLint, TypeScript, Prettier checks

**Status:** ✅ Complete

---

### 2. Website Deployment (Vercel Integration)

**Trigger:** Push to `main` branch
**Purpose:** Deploy website to production

**Implementation:** Vercel GitHub Integration (automatic)

**Setup:**
1. Connect Vercel to GitHub repository
2. Configure Vercel project:
   - **Root Directory:** `packages/website`
   - **Framework:** Next.js (or your framework)
   - **Build Command:** `npm run build --workspace=@carvd/website`
   - **Output Directory:** `.next` or `dist`
3. Set environment variables in Vercel dashboard

**Features:**
- ✅ **Production deployment** on push to `main`
- ✅ **Preview deployments** for every PR
- ✅ **Automatic HTTPS** with custom domain
- ✅ **Instant rollbacks** if issues occur

**Status:** ⏳ Pending Vercel connection

---

### 3. Webhook Deployment (Vercel Integration)

**Trigger:** Push to `main` branch
**Purpose:** Deploy webhook service to production

**Implementation:** Vercel GitHub Integration (automatic)

**Setup:**
1. Connect Vercel to GitHub repository
2. Configure Vercel project:
   - **Root Directory:** `packages/webhook`
   - **Build Command:** None needed (serverless function)
   - **Output Directory:** `api/`
3. Set environment variables in Vercel dashboard:
   - `LICENSE_PRIVATE_KEY` - Private key for JWT signing
   - `LEMON_SQUEEZY_WEBHOOK_SECRET` - Webhook signature verification
   - `NODE_ENV=production`

**Features:**
- ✅ **Production deployment** on push to `main`
- ✅ **Preview deployments** for testing
- ✅ **Automatic scaling** for webhook traffic
- ✅ **Edge network** for low latency

**Webhook URL:** `https://your-webhook-domain.vercel.app/api/webhook`

**Status:** ⏳ Pending Vercel connection

---

### 4. Desktop App Release Workflow (To Implement)

**File:** `.github/workflows/release.yml`
**Trigger:** Git tag matching `v*.*.*` (e.g., `v1.2.0`)
**Purpose:** Build, sign, and distribute desktop app

**Flow:**
```
Git tag pushed (v1.2.0)
    ↓
Workflow triggers on macOS and Windows runners
    ↓
Build desktop app for platform
    ↓
Sign builds:
  - macOS: Code sign + notarize with Apple
  - Windows: Code sign (optional)
    ↓
Upload to Lemon Squeezy via API:
  - macOS DMG → macOS variant
  - Windows installer → Windows variant
    ↓
Create GitHub Release:
  - Attach build artifacts
  - Generate changelog from commits
  - Mark as latest release
    ↓
Done! Customers can download from Lemon Squeezy
```

**Jobs:**

#### Job 1: Build macOS
- **Runner:** `macos-latest`
- **Steps:**
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Import code signing certificate (from secrets)
  5. Build app: `npm run build --workspace=@carvd/desktop`
  6. Package as DMG: `npm run package:mac`
  7. Code sign DMG
  8. Notarize with Apple
  9. Upload to Lemon Squeezy API
  10. Upload artifact to GitHub Release

#### Job 2: Build Windows
- **Runner:** `windows-latest`
- **Steps:**
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Build app: `npm run build --workspace=@carvd/desktop`
  5. Package as installer: `npm run package:win`
  6. (Optional) Code sign with certificate
  7. Upload to Lemon Squeezy API
  8. Upload artifact to GitHub Release

#### Job 3: Create Release
- **Runner:** `ubuntu-latest`
- **Depends on:** Build macOS, Build Windows
- **Steps:**
  1. Download all build artifacts
  2. Generate changelog from git commits
  3. Create GitHub Release
  4. Attach DMG and installer files
  5. Mark as latest release

**Required GitHub Secrets:**

**Lemon Squeezy API:**
- `LEMON_SQUEEZY_API_KEY` - API key from LS dashboard
- `LEMON_SQUEEZY_STORE_ID` - Your store ID
- `LEMON_SQUEEZY_PRODUCT_ID` - Carvd Studio product ID
- `LEMON_SQUEEZY_VARIANT_ID_MACOS` - macOS variant ID
- `LEMON_SQUEEZY_VARIANT_ID_WINDOWS` - Windows variant ID

**Apple Code Signing & Notarization:**
- `APPLE_ID` - Apple ID email for notarization
- `APPLE_ID_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Apple Developer Team ID
- `CSC_LINK` - Base64-encoded .p12 certificate file
- `CSC_KEY_PASSWORD` - Password for .p12 certificate

**Windows Code Signing (Optional):**
- `WINDOWS_CERTIFICATE` - Base64-encoded .pfx certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

**Other:**
- `LICENSE_PRIVATE_KEY` - Already configured ✅
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

**Status:** ⏳ To implement

---

### 5. Auto-Update System (To Implement)

**Purpose:** Automatically deliver updates to users who have already installed the app

**Implementation:** electron-updater + GitHub Releases

**How it works:**
```
User launches app
    ↓
App checks GitHub Releases API for new versions
    ↓
New version available?
    ↓
Download update in background
    ↓
Show notification: "Update v1.2.0 ready to install"
    ↓
User clicks "Restart & Update"
    ↓
App restarts with new version ✅
```

**Architecture:**

```
Release Workflow (git tag v1.2.0)
    ↓
Builds signed apps
    ↓
    ├─> GitHub Releases (auto-updates for existing users)
    └─> Lemon Squeezy (initial downloads for new customers)
```

**Key Features:**
- ✅ **Automatic checking** on app launch and every 6 hours
- ✅ **Background downloads** don't interrupt user workflow
- ✅ **User control** over when to install (restart required)
- ✅ **Preserves license** activation across updates
- ✅ **Code-signed updates** ensure security
- ✅ **Rollback support** via GitHub Releases versioning

**Setup Steps:**

1. **Install electron-updater:**
   ```bash
   cd packages/desktop
   npm install electron-updater
   ```

2. **Configure electron-builder** (add to config):
   ```yaml
   publish:
     - provider: github
       owner: your-username
       repo: carvd-studio
       releaseType: release
   ```

3. **Add update checking to main process:**
   ```typescript
   import { autoUpdater } from 'electron-updater';

   // Check for updates on app launch (after 3s delay)
   app.whenReady().then(() => {
     setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
   });

   // Check every 6 hours
   setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 6 * 60 * 60 * 1000);
   ```

4. **Add update UI to renderer:**
   - Show notification banner when update available
   - Show "Restart & Update" button when download complete
   - Optional: Progress bar during download

5. **Test with beta releases:**
   ```bash
   git tag v1.0.0-beta.1
   git push origin v1.0.0-beta.1
   ```

**Update Flow for Users:**

**Initial Purchase (New Customer):**
1. Buys on Lemon Squeezy
2. Downloads installer from Lemon Squeezy
3. Installs and activates with license key

**Subsequent Updates (Existing User):**
1. App checks GitHub Releases in background
2. Finds new version available
3. Downloads update silently
4. Notifies user: "Update ready"
5. User restarts when convenient
6. Update installs automatically

**Security:**
- macOS: Code signing + notarization required for seamless updates
- Windows: Code signing enables automatic updates without warnings
- Updates served over HTTPS from GitHub's CDN
- License validation preserved locally

**Why GitHub Releases:**
- ✅ Free, fast global CDN
- ✅ Proven solution (VSCode, Slack, Figma use this)
- ✅ No infrastructure to maintain
- ✅ Automatic with electron-updater
- ✅ Version history for rollbacks

**Privacy:**
- No user identification sent to GitHub
- Just checks: "Is there a newer version?"
- No analytics tracked
- HTTPS-only downloads

**Status:** ⏳ To implement after release workflow

---

## Version Management

### Strategy: Manual Versioning with Tags

We use **manual version bumping** for maximum control and clarity.

**Process:**

1. **Update version numbers** in package.json files:
   ```bash
   # Update all package.json files
   npm version patch --workspace=@carvd/desktop
   npm version patch --workspace=@carvd/website
   npm version patch --workspace=@carvd/webhook

   # Or use a script to update all at once
   npm run version:bump -- patch
   ```

2. **Commit version changes:**
   ```bash
   git add .
   git commit -m "Release v1.2.0"
   ```

3. **Create git tag:**
   ```bash
   git tag v1.2.0
   ```

4. **Push to trigger release:**
   ```bash
   git push origin main
   git push origin v1.2.0
   ```

5. **Release workflow runs automatically** 🚀

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major (v2.0.0):** Breaking changes, incompatible API changes
- **Minor (v1.3.0):** New features, backward compatible
- **Patch (v1.2.1):** Bug fixes, backward compatible

### Changelog Generation

Changelogs are generated automatically from git commits using conventional commit messages:

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature → Minor version bump
- `fix`: Bug fix → Patch version bump
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(desktop): add auto-save functionality"
git commit -m "fix(webhook): handle missing email in order webhook"
git commit -m "docs(readme): update installation instructions"
```

**Changelog Output:**
```markdown
## v1.2.0 (2026-02-15)

### Features
- **desktop:** add auto-save functionality
- **desktop:** implement dark mode toggle

### Bug Fixes
- **webhook:** handle missing email in order webhook
- **desktop:** fix license verification on Windows

### Documentation
- **readme:** update installation instructions
```

---

## Deployment Environments

### Website (packages/website/)

| Environment | Branch | URL | Deploy Trigger |
|-------------|--------|-----|----------------|
| **Production** | `main` | `carvd.com` | Push to main |
| **Preview** | Any PR | `pr-123.vercel.app` | PR creation |
| **Local** | - | `localhost:3000` | `npm run dev` |

### Webhook (packages/webhook/)

| Environment | Branch | URL | Deploy Trigger |
|-------------|--------|-----|----------------|
| **Production** | `main` | `webhook.carvd.com/api/webhook` | Push to main |
| **Preview** | Any PR | `webhook-pr-123.vercel.app` | PR creation |
| **Local** | - | `localhost:3000/api/webhook` | `npm run test` |

### Desktop App (packages/desktop/)

| Environment | Trigger | Output | Destination |
|-------------|---------|--------|-------------|
| **Production** | Git tag `v*` | Signed DMG/installer | Lemon Squeezy |
| **GitHub Release** | Git tag `v*` | Signed DMG/installer | GitHub Releases |
| **Local Build** | Manual | Unsigned app | Local machine |

---

## Security Considerations

### Secrets Management

**Never commit:**
- ❌ API keys
- ❌ Private keys
- ❌ Certificates
- ❌ Passwords
- ❌ Environment variables with sensitive data

**Always use:**
- ✅ GitHub Secrets for CI/CD
- ✅ Vercel Environment Variables for deployments
- ✅ `.gitignore` for local `.env` files

### Code Signing

**macOS:**
- Requires Apple Developer account ($99/year)
- Certificate must be valid and not expired
- Notarization required for distribution outside Mac App Store

**Windows:**
- Code signing optional but recommended
- Requires EV certificate or standard code signing certificate
- Windows SmartScreen warnings without signing

---

## Rollback Strategy

### Website/Webhook (Vercel)
- **Instant rollback** via Vercel dashboard
- Click "Rollback" on any previous deployment
- Takes effect immediately (< 30 seconds)

### Desktop App
- **Create hotfix tag** (e.g., `v1.2.1`) with fix
- Release workflow builds and deploys automatically
- Uploads to GitHub Releases and Lemon Squeezy
- **Existing users:** Auto-update delivers fix within hours
- **New customers:** Download fixed version from Lemon Squeezy

### Emergency Rollback
1. Identify issue in production
2. Revert changes in git
3. Push to main (website/webhook update immediately)
4. Create new tag for desktop app if needed
5. Monitor for resolution

---

## Monitoring & Alerts

### GitHub Actions
- **Email notifications** on workflow failures
- Check **Actions** tab for build status
- Review logs for debugging

### Vercel
- **Deployment notifications** in Slack/Discord (optional)
- **Error tracking** with Vercel Analytics
- **Performance monitoring** built-in

### Lemon Squeezy
- **Webhook failure alerts** via email
- Check LS dashboard for webhook logs
- Monitor order creation and license delivery

---

## Implementation Checklist

### Phase 1: Core Automation ✅
- [x] Test workflow (test.yml)
- [x] License key management in CI/CD
- [x] Multi-platform test execution

### Phase 2: Deployment Automation ⏳
- [ ] Connect Vercel to GitHub repository
- [ ] Configure website deployment
- [ ] Configure webhook deployment
- [ ] Test preview deployments
- [ ] Configure production domains

### Phase 3: Release Automation ⏳
- [ ] Obtain Apple Developer account & certificates
- [ ] (Optional) Obtain Windows code signing certificate
- [ ] Add all required GitHub Secrets
- [ ] Create release.yml workflow
- [ ] Configure electron-builder for GitHub Releases
- [ ] Implement auto-update system with electron-updater
- [ ] Add update notification UI
- [ ] Test release process with beta tag
- [ ] Configure Lemon Squeezy API access
- [ ] Test file upload to Lemon Squeezy
- [ ] Test auto-update functionality

### Phase 4: Version Management ⏳
- [ ] Create version bump script
- [ ] Document commit message conventions
- [ ] Set up changelog generation
- [ ] Create release documentation

### Phase 5: Monitoring & Optimization ⏳
- [ ] Set up deployment notifications
- [ ] Configure error tracking
- [ ] Monitor workflow performance
- [ ] Optimize build times

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Core automation | ✅ Complete |
| **Phase 2** | Deployment automation | 1-2 hours |
| **Phase 3** | Release automation | 4-6 hours |
| **Phase 4** | Version management | 1-2 hours |
| **Phase 5** | Monitoring | 1 hour |

**Total:** ~7-11 hours of setup work

**Long-term savings:** Hours per release (manual → automated)

---

## Next Steps

1. **Connect Vercel** to GitHub repository
   - Configure website deployment
   - Configure webhook deployment

2. **Gather code signing credentials**
   - Apple Developer account + certificates
   - (Optional) Windows code signing certificate

3. **Add GitHub Secrets**
   - Lemon Squeezy API credentials
   - Apple credentials
   - Windows credentials (if applicable)

4. **Implement release.yml workflow**
   - Build and sign desktop app
   - Upload to Lemon Squeezy
   - Create GitHub Releases

5. **Implement auto-update system**
   - Install electron-updater
   - Configure GitHub Releases publishing
   - Add update checking code
   - Add update notification UI

6. **Test release process**
   - Create test tag (v1.0.0-beta)
   - Verify builds complete
   - Verify upload to Lemon Squeezy
   - Verify GitHub Release creation
   - Test auto-update from old version to new

7. **Document for team**
   - Release process
   - Auto-update behavior
   - Troubleshooting guide
   - Rollback procedures

---

**Created:** 2026-02-02
**Status:** Planning phase - ready to implement
