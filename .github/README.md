# GitHub Actions CI/CD

## Required Secrets

The following repository secrets must be configured for the test workflow to run successfully:

### `LICENSE_PRIVATE_KEY`

**Purpose:** Provides the RSA private key needed to generate test licenses during CI runs.

**Setup:**

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `LICENSE_PRIVATE_KEY`
4. Value: Contents of `packages/desktop/license-private-key.pem`
5. Click **Add secret**

**How it's used:**

- The workflow writes this secret to `license-private-key.pem` during test runs
- Tests can then generate and verify license keys
- The file is never committed and exists only in the CI environment

## Workflows

### `test.yml` - Test Suite

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**

- **unit-tests:** Vitest unit and integration tests (Ubuntu only)
- **e2e-tests:** Playwright E2E tests with Electron (Ubuntu, macOS, Windows)
- **lint:** TypeScript type check + Prettier format check for both desktop and website (Ubuntu)
- **website-tests:** Vitest unit tests for the marketing website (Ubuntu)
- **website-e2e:** Playwright E2E tests for the marketing website (Ubuntu, Chromium)

**Environment Variables:**

- `NODE_ENV=test` - Signals test environment
- `CI=true` - Enables CI-specific behavior in E2E tests

**Node Version:** Uses `.nvmrc` file (Node 22) via `node-version-file`

### `changelog-check.yml` - Changelog CI Check

Runs on pull requests targeting `main`. Fails if `CHANGELOG.md` was not modified, ensuring all production releases include changelog entries.

### `release.yml` - Release Pipeline

Triggered by pushes to `main`. Builds macOS (code-signed + notarized) and Windows installers, creates a GitHub Release, updates the website version on Vercel, and creates a version bump PR targeting `develop`.

## Troubleshooting

**Problem:** Tests fail with "license-private-key.pem not found"

- **Solution:** Verify the `LICENSE_PRIVATE_KEY` secret is configured in repository settings

**Problem:** E2E tests are flaky

- **Solution:** Tests automatically retry 2 times in CI. Check uploaded artifacts for screenshots/videos

**Problem:** Coverage not uploading to Codecov

- **Solution:** Ensure `CODECOV_TOKEN` secret is configured (if private repo)

## Local Development

Local testing does not require GitHub Secrets. The gitignored `license-private-key.pem` file in `packages/desktop/` is used automatically.
