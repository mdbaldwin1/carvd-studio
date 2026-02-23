# GitHub Repository Setup Guide

This document contains the complete configuration for the carvd-studio repository on GitHub.

## Branch Structure ✅

**Created:**

- ✅ `main` - Production-ready code only
- ✅ `develop` - Integration branch for development

**Workflow:**

```
Feature branches → develop → main
                     ↓         ↓
                  Integration  Production
                    testing    releases
```

---

## 1. General Settings

**Location:** `Settings → General`

### Features

- [x] Issues: ✅ Enabled
- [x] Projects: ✅ Enabled (optional)
- [x] Wiki: ❌ Disabled (use README/docs instead)
- [x] Discussions: ❌ Disabled (use Issues)

### Pull Requests

- [x] **Allow merge commits:** ✅ Enabled
- [x] **Allow squash merging:** ✅ Enabled (recommended)
  - Default to: "Pull request title"
- [x] **Allow rebase merging:** ❌ Disabled
- [x] **Always suggest updating pull request branches:** ✅ Enabled
- [x] **Allow auto-merge:** ✅ Enabled
- [x] **Automatically delete head branches:** ✅ Enabled

---

## 2. Branch Protection Rules

### Protection for `main` branch

**Location:** `Settings → Branches → Add branch protection rule`

**Branch name pattern:** `main`

#### Protect matching branches:

**✅ Require a pull request before merging**

- [x] Require approvals: `0` (for solo work) or `1` (if team)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners: ❌ Disabled (unless you add CODEOWNERS file)
- [x] Require approval of the most recent reviewable push

**✅ Require status checks to pass before merging**

- [x] Require branches to be up to date before merging
- **Required status checks:**
  - `Unit & Integration Tests` ✅
  - `E2E Tests (ubuntu-latest)` ✅
  - `E2E Tests (macos-latest)` ✅
  - `E2E Tests (windows-latest)` ✅
  - `Lint & Type Check` ✅
  - `Website Unit Tests` ✅
  - `Website E2E Tests` ✅

**✅ Require conversation resolution before merging**

- Ensures all PR comments are resolved

**✅ Require signed commits** (optional but recommended)

- Ensures commit authenticity

**❌ Require linear history**

- Disabled (allows merge commits)

**✅ Require deployments to succeed before merging** (optional)

- Enable if you add staging deployment

**✅ Lock branch**

- ❌ Disabled (you need to push releases)

**✅ Do not allow bypassing the above settings**

- ✅ Enabled (even admins must follow rules)

**✅ Restrict who can push to matching branches** (optional)

- ❌ Disabled for now (enable if team grows)

**✅ Allow force pushes**

- ❌ Disabled

**✅ Allow deletions**

- ❌ Disabled

---

### Protection for `develop` branch

**Location:** `Settings → Branches → Add branch protection rule`

**Branch name pattern:** `develop`

#### Protect matching branches:

**✅ Require a pull request before merging** (optional for solo dev)

- [x] Require approvals: `0` (solo) or `1` (team)
- [x] Dismiss stale pull request approvals when new commits are pushed

**✅ Require status checks to pass before merging**

- [x] Require branches to be up to date before merging
- **Required status checks** (same as main):
  - Unit & Integration Tests, E2E Tests (3 platforms), Lint & Type Check, Website Unit Tests, Website E2E Tests

**✅ Require conversation resolution before merging**

**✅ Do not allow bypassing the above settings**

- ✅ Enabled (even admins must follow rules)

**✅ Allow force pushes**

- ❌ Disabled

**✅ Allow deletions**

- ❌ Disabled

---

## 3. Actions Settings

**Location:** `Settings → Actions → General`

### Actions permissions

- **Policy:** "Allow all actions and reusable workflows"

### Workflow permissions

- [x] **Read and write permissions** ✅
  - Allows workflows to:
    - Create releases
    - Upload artifacts
    - Update PRs
    - Modify repository content

- [x] **Allow GitHub Actions to create and approve pull requests** ✅
  - Needed for automated dependency updates

### Fork pull request workflows

- **Policy:** "Require approval for first-time contributors"
  - Prevents malicious workflow runs

---

## 4. Secrets Configuration

**Location:** `Settings → Secrets and variables → Actions → Secrets`

### Currently Configured:

- [x] `LICENSE_PRIVATE_KEY` ✅ - RSA private key for test license generation
- [x] `CSC_LINK` ✅ - Base64-encoded .p12 certificate (macOS code signing)
- [x] `CSC_KEY_PASSWORD` ✅ - Password for the .p12 file
- [x] `APPLE_ID` ✅ - Apple Developer email (for notarization)
- [x] `APPLE_ID_PASSWORD` ✅ - App-specific password (for notarization)
- [x] `APPLE_TEAM_ID` ✅ - 10-character team ID (for notarization)
- [x] `VERCEL_TOKEN` ✅ - Vercel API token
- [x] `VERCEL_PROJECT_ID` ✅ - Vercel website project ID

- [x] `VERCEL_ORG_ID` ✅ - Vercel organization/team ID

### Optional (Not Configured):

- [ ] `WINDOWS_CERTIFICATE` - Windows code signing certificate
- [ ] `WINDOWS_CERTIFICATE_PASSWORD` - Password for the certificate

### Variables (Optional)

**Location:** `Settings → Secrets and variables → Actions → Variables`

These are non-sensitive values visible in logs:

- `PRODUCT_NAME`: "Carvd Studio"
- `BUNDLE_ID`: "com.carvd.studio"

---

## 5. Code Security & Analysis

**Location:** `Settings → Security → Code security and analysis`

### Dependency Graph

- [x] **Dependency graph:** ✅ Enabled (automatic for public/private repos)

### Dependabot

- [x] **Dependabot alerts:** ✅ Enabled
  - Get notified of vulnerable dependencies
- [x] **Dependabot security updates:** ✅ Enabled
  - Auto-creates PRs to fix vulnerabilities
- [x] **Dependabot version updates:** ✅ Configured via `.github/dependabot.yml`
  - Desktop deps: Weekly on Mondays, targets `develop` branch
  - Root workspace deps: Weekly on Mondays, targets `develop` branch
  - GitHub Actions: Monthly, targets `develop` branch
  - Groups: electron, testing, threejs dependencies

### Code Scanning (CodeQL)

- [x] **Code scanning:** ✅ Enable CodeQL
  - Automatic analysis of JavaScript/TypeScript code
  - Finds security vulnerabilities and code quality issues

**To enable:** Click "Set up" → "Default" (automatic setup)

This creates: `.github/workflows/codeql.yml`

### Secret Scanning

- [x] **Secret scanning:** ✅ Enabled (automatic for public repos)
  - GitHub alerts you if secrets are committed
  - Supports 200+ token types (AWS, GCP, Azure, etc.)
- [x] **Push protection:** ✅ Enabled
  - Blocks pushes that contain secrets

---

## 6. Collaborators & Teams (Future)

**Location:** `Settings → Collaborators and teams`

**Current:** Solo developer

**When adding team members:**

1. Add as collaborators with appropriate permissions:
   - **Admin:** Full access (you)
   - **Maintain:** Manage repository without sensitive settings
   - **Write:** Push to repository, create branches
   - **Triage:** Manage issues and PRs only
   - **Read:** View and clone only

2. Create CODEOWNERS file:

```
# .github/CODEOWNERS
# Default owner for everything
* @mdbaldwin1

# Desktop app
/packages/desktop/ @mdbaldwin1

# Infrastructure
/.github/ @mdbaldwin1
```

---

## 7. Environments (Future)

**Location:** `Settings → Environments`

**For production releases (optional):**

Create environment: `production`

- **Deployment branches:** Only `main` branch
- **Environment secrets:** (same as repository secrets)
- **Reviewers:** Add yourself or team members
  - Requires manual approval before release

**Benefits:**

- Manual gate before production releases
- Separate secrets per environment
- Deployment history and logs

---

## 8. Webhooks (Optional)

**Location:** `Settings → Webhooks`

**Current:** None needed (GitHub Actions handles everything)

**Future possibilities:**

- Slack/Discord notifications on releases
- External CI/CD systems
- Custom deployment triggers

---

## 9. Notifications

**Location:** Your GitHub user settings → Notifications

**Recommended settings for this repository:**

**Actions:**

- [x] **Notify on workflow failures:** ✅
- [x] **Notify on workflow success:** ❌ (too noisy)

**Pull Requests:**

- [x] **You're assigned:** ✅
- [x] **Review requested:** ✅
- [x] **Someone comments:** ✅
- [x] **PR state changes:** ✅

**Issues:**

- [x] **You're assigned:** ✅
- [x] **Someone mentions you:** ✅

---

## 10. Repository Visibility

**Location:** `Settings → General → Danger Zone → Change repository visibility`

**Current:** ✅ **Public**

The repository is public to allow users to download releases from GitHub. The license key system protects revenue - users can download the app freely but need to purchase a license for full features after the trial period.

**Benefits of public:**

- Users can download releases without authentication
- Unlimited free GitHub Actions minutes
- Community can report issues and contribute
- Transparent development builds trust

---

## Setup Checklist

### Completed:

- [x] ✅ Create `develop` branch
- [x] ✅ Configure branch protection for `main`
- [x] ✅ Configure branch protection for `develop`
- [x] ✅ Enable Dependabot alerts
- [x] ✅ Enable Dependabot security updates
- [x] ✅ Enable secret scanning
- [x] ✅ Make repository public
- [x] ✅ Configure Actions workflow permissions
- [x] ✅ Add Apple code signing secrets
- [x] ✅ Add Vercel secrets (TOKEN + PROJECT_ID + ORG_ID)
- [x] ✅ Create `.github/dependabot.yml` for automated updates
- [x] ✅ Release workflow tested and working (v0.1.0 released)
- [x] ✅ CI test workflow working on all platforms
- [x] ✅ Claude Code Vercel MCP access configured
- [x] ✅ macOS notarization working (Developer ID Application + Apple notarytool)
- [x] ✅ Pre-commit hooks (husky + lint-staged + prettier)
- [x] ✅ `.nvmrc` for Node version pinning (Node 22)
- [x] ✅ `.editorconfig` for editor consistency
- [x] ✅ GitHub Issue Templates (bug report + feature request)
- [x] ✅ PR template with checklist
- [x] ✅ Changelog CI check (PRs to main require CHANGELOG.md changes)
- [x] ✅ Website CI checks (typecheck + format)

### Still Needed:

- [ ] (Optional) Add Windows code signing certificate
- [ ] Set up Lemon Squeezy product and configure checkout URL

### Optional Enhancements:

- [ ] Enable CodeQL scanning
- [ ] Create CODEOWNERS file
- [ ] Set up production environment with approvals
- [ ] Configure Slack/Discord notifications

---

## Workflow Summary

### Daily Development:

```bash
# Create feature branch from develop
git checkout develop
git pull
git checkout -b feature/my-feature

# Work on feature, commit changes
git add .
git commit -m "feat(desktop): add new feature"

# Push and create PR to develop
git push -u origin feature/my-feature
# Go to GitHub → Create PR → target: develop
# Tests run automatically
# Merge when tests pass
```

### Preparing a Release:

```bash
# On develop, bump the version
cd packages/desktop
node scripts/version-bump.cjs patch  # or minor, major
git push origin develop

# Create PR from develop to main
# Go to GitHub → Create PR
# Base: main, Compare: develop
# Tests run automatically
# Merge when ready

# After merge to main, release workflow triggers automatically:
# 1. Reads version from packages/desktop/package.json
# 2. Skips if that version is already released
# 3. Builds macOS (x64 + arm64) and Windows
# 4. Creates GitHub Release with DMG, ZIP, EXE artifacts
# 5. Creates a version bump PR targeting develop
# sync-develop.yml also merges main back into develop
# website-version-bump.yml handles Vercel deploy + website versioning separately
```

### Hotfix Process:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# Fix the bug, bump version in packages/desktop/package.json
git add .
git commit -m "fix(desktop): resolve critical bug"

# Create PR to main (skip develop for urgent fixes)
git push -u origin hotfix/critical-bug
# Go to GitHub → Create PR → target: main
# Tests run, merge when tests pass (squash merge)

# After merge to main, the release workflow triggers automatically:
# 1. Builds macOS + Windows
# 2. Creates GitHub Release
# 3. Creates a version bump PR targeting develop
# sync-develop.yml merges main back into develop automatically
```

---

**Last Updated:** 2026-02-18
**Status:** Core configuration complete, release pipeline operational
