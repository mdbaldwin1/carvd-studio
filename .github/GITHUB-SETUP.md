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
- **Required status checks** (add these after first workflow run):
  - `unit-tests (ubuntu-latest, 20)` ✅
  - `unit-tests (macos-latest, 20)` ✅
  - `unit-tests (windows-latest, 20)` ✅
  - `e2e-tests (ubuntu-latest, 20)` ✅
  - `e2e-tests (macos-latest, 20)` ✅
  - `lint` ✅

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
  - All unit-tests, e2e-tests, lint checks

**✅ Require conversation resolution before merging**

**❌ Do not allow bypassing the above settings**
- ❌ Disabled (you can push directly for quick fixes)

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
- [x] `LICENSE_PRIVATE_KEY` ✅

### Required for Release Workflow:

**Apple (macOS Code Signing):**
- [ ] `APPLE_ID`
- [ ] `APPLE_ID_PASSWORD`
- [ ] `APPLE_TEAM_ID`
- [ ] `CSC_LINK`
- [ ] `CSC_KEY_PASSWORD`

**Windows (Optional Code Signing):**
- [ ] `WINDOWS_CERTIFICATE`
- [ ] `WINDOWS_CERTIFICATE_PASSWORD`

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
- [ ] **Dependabot version updates:** ⏳ Enable after creating config

**To enable version updates, create:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # Desktop app dependencies
  - package-ecosystem: "npm"
    directory: "/packages/desktop"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      electron:
        patterns:
          - "electron*"
      testing:
        patterns:
          - "*vitest*"
          - "*playwright*"
          - "*testing-library*"

  # Website dependencies
  - package-ecosystem: "npm"
    directory: "/packages/website"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

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

### Immediate (Now):
- [x] ✅ Create `develop` branch
- [x] ✅ Configure branch protection for `main`
- [x] ✅ Configure branch protection for `develop`
- [x] ✅ Enable Dependabot alerts
- [x] ✅ Enable Dependabot security updates
- [x] ✅ Enable secret scanning
- [x] ✅ Make repository public
- [ ] Configure Actions workflow permissions

### Before First Release:
- [ ] Add Lemon Squeezy secrets
- [ ] Add Apple code signing secrets
- [ ] (Optional) Add Windows code signing secrets
- [ ] Test workflow runs
- [ ] Verify required status checks

### Optional Enhancements:
- [x] ✅ Create `.github/dependabot.yml` for automated updates
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
# Create PR from develop to main
# Go to GitHub → Create PR
# Base: main
# Compare: develop
# Tests run automatically
# Review changes
# Merge when ready

# After merge to main, create release tag
git checkout main
git pull
npm run version:bump -- minor  # or patch, major
git push origin main
git push origin v1.2.0

# Release workflow triggers automatically
# Builds, signs, and uploads to Lemon Squeezy + GitHub Releases
```

### Hotfix Process:
```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# Fix the bug
git add .
git commit -m "fix(desktop): resolve critical bug"

# Create PR to main (skip develop for urgent fixes)
git push -u origin hotfix/critical-bug
# Go to GitHub → Create PR → target: main
# Tests run
# Merge when tests pass

# Create hotfix release
git checkout main
git pull
git tag v1.2.1
git push origin v1.2.1

# Merge back to develop to keep in sync
git checkout develop
git merge main
git push origin develop
```

---

**Last Updated:** 2026-02-10
**Status:** Core configuration complete
