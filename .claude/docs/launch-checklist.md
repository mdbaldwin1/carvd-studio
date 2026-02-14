# Carvd Studio Launch Checklist

Last updated: 2026-02-14

## Priority Order

1. ~~**Create GitHub Release**~~ ✅ Automated via release workflow (v0.1.9 released)
2. **Get app icon/logo** (from designer)
3. **Add screenshots** (high visual impact)
4. **Create video demo** (walkthrough)
5. **Set up Lemon Squeezy** (required for purchases)
6. ~~**Enable macOS notarization**~~ ✅ Working (Developer ID Application cert + Apple notarytool)
7. **Create og-image.png** (for social sharing)
8. **Set up professional email** (for support)
9. **Add analytics** (nice to have)
10. **Run testing checklist** (before announcing)
11. **Investigate production build performance** (Three.js sluggish in packaged app vs dev)

---

## 1. Create Product Screenshots

**What:** Capture high-quality screenshots of the app to replace the `ScreenshotPlaceholder` components on the website.

### Screenshots for HomePage.tsx

| #   | Description                       | Aspect Ratio | Notes                                                                                               |
| --- | --------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| 1   | **Hero: Main 3D workspace**       | 16:9         | Full app window with a realistic project (8-12 parts). Show sidebar, 3D view, and properties panel. |
| 2   | **Cut list modal - Diagrams tab** | 4:3          | Show optimized board layouts with color-coded parts labeled                                         |
| 3   | **Shopping list / Cost view**     | 4:3          | Show Shopping tab with material quantities, costs, utilization %                                    |

### Screenshots for FeaturesPage.tsx

| #   | Description                       | Aspect Ratio | Notes                                                           |
| --- | --------------------------------- | ------------ | --------------------------------------------------------------- |
| 4   | **3D workspace with dimensions**  | 16:9         | Show parts with dimension labels visible, maybe a part selected |
| 5   | **Cut list - Board layouts**      | 16:9         | Diagrams tab showing multiple boards with parts arranged        |
| 6   | **Stock library / Cost tracking** | 16:9         | Stock library modal OR properties panel showing cost            |

### Screenshots for DocsPage.tsx (Optional but helpful)

| #   | Description                        | Aspect Ratio | Notes                                                                               |
| --- | ---------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| 7   | **Interface overview - annotated** | 16:9         | Main workspace with labels pointing to: sidebar, 3D view, properties panel, toolbar |
| 8   | **Part properties panel**          | 4:3          | Close-up of properties panel with fields visible                                    |
| 9   | **Cut list Parts tab**             | 4:3          | Show parts grouped by dimensions with quantities                                    |
| 10  | **Stock library modal**            | 4:3          | Show list of stock materials with prices                                            |
| 11  | **Group hierarchy in sidebar**     | 4:3          | Show nested groups in the sidebar tree view                                         |
| 12  | **Assembly library**               | 4:3          | Show assembly browser with thumbnails                                               |
| 13  | **Snapping alignment lines**       | 4:3          | Mid-drag showing snap lines between parts                                           |
| 14  | **App settings modal**             | 4:3          | Show settings options                                                               |
| 15  | **New project dialog**             | 4:3          | Show the new project creation dialog                                                |

### How to Capture

1. Open Carvd Studio desktop app
2. Load or create a realistic project:
   - Use the "Simple Desk" or "Basic Bookshelf" template as a base
   - Ensure 8-12 parts with multiple stock types
   - Groups are visible in sidebar
3. Use **dark theme** (more visually striking)
4. **Resize window precisely** using the resize script:

   ```bash
   # For 16:9 screenshots (hero, features, interface overview)
   # Screenshots #1, #4, #5, #6, #7
   ./packages/desktop/scripts/resize-for-screenshots.sh large

   # For 4:3 screenshots (modals, panels, detail shots)
   # Screenshots #2, #3, #8-15
   ./packages/desktop/scripts/resize-for-screenshots.sh small
   ```

   | Size    | Dimensions | Use For                                        |
   | ------- | ---------- | ---------------------------------------------- |
   | `large` | 1400×900   | Hero shots, full workspace, feature highlights |
   | `small` | 800×600    | Modals, panels, sidebar details                |

5. **Capture the screenshot:**
   - macOS: `Cmd+Shift+4` then `Space` then click the window
   - Windows: `Win+Shift+S` or Snipping Tool

### Project Setup for Screenshots

For best results, create/load a project with:

- [ ] Multiple stock types (plywood + hardwood)
- [ ] Groups visible in sidebar (e.g., "Drawer Assembly")
- [ ] At least one part selected to show properties
- [ ] Realistic part names (not "Part 1", "Part 2")
- [ ] Stock prices set (so costs appear)
- [ ] Generated cut list ready to show

### Where to Save

```
packages/website/public/screenshots/
├── hero-workspace.png           (1400x788, 16:9)
├── cut-list-diagrams.png        (800x600, 4:3)
├── shopping-list.png            (800x600, 4:3)
├── features-3d-workspace.png    (1400x788, 16:9)
├── features-cut-list.png        (1400x788, 16:9)
├── features-cost-tracking.png   (1400x788, 16:9)
├── docs-interface-overview.png  (1400x788, 16:9)
├── docs-properties-panel.png    (800x600, 4:3)
├── docs-parts-tab.png           (800x600, 4:3)
├── docs-stock-library.png       (800x600, 4:3)
├── docs-groups-sidebar.png      (800x600, 4:3)
├── docs-assembly-library.png    (800x600, 4:3)
├── docs-snap-lines.png          (800x600, 4:3)
├── docs-settings.png            (800x600, 4:3)
└── docs-new-project.png         (800x600, 4:3)
```

### After Capturing, Update Code

**HomePage.tsx:**
Replace `<ScreenshotPlaceholder ... />` with `<img src="/screenshots/hero-workspace.png" alt="..." className="rounded-lg shadow-lg" />`

**FeaturesPage.tsx:**
Replace `<ScreenshotPlaceholder ... />` with appropriate `<img>` tags

**DocsPage.tsx (optional):**
Add images between sections to illustrate concepts

---

## 2. Create Social Sharing Image (og-image.png)

**What:** Create an image that appears when the website is shared on social media (Facebook, Twitter, LinkedIn, etc.)

**Specs:**

- Size: **1200 x 630 pixels** (optimal for all platforms)
- Format: PNG or JPG
- File location: `packages/website/public/og-image.png`

**Content suggestions:**

- App logo/name "Carvd Studio"
- Tagline: "Design furniture in 3D. Optimize your cuts."
- A small screenshot or mockup of the app
- Dark background matching site theme (#1a1a1a)

**Tools to create:**

- Figma (free): figma.com
- Canva (free): canva.com
- Or any image editor

---

## 3. Set Up Lemon Squeezy Product

**What:** Create your product in Lemon Squeezy to accept payments and deliver license keys.

### 3a. Create Lemon Squeezy Account

1. Go to https://lemonsqueezy.com
2. Sign up for an account
3. Complete business verification (required for payouts)

### 3b. Create Store

1. Dashboard → Settings → Store
2. Note your **Store ID** (shown in URL or settings)

### 3c. Create Product

1. Dashboard → Products → Create Product
2. Fill in:
   - **Name:** Carvd Studio License
   - **Price:** $59.99 (one-time)
   - **Description:** Full license for Carvd Studio woodworking design software. Works on Mac and Windows.
3. Under **License Keys** section:
   - Enable "Generate license keys"
   - Set activation limit (e.g., 2 devices per license)
4. Save product

### 3d. Get Checkout URL

1. Go to your product → Share
2. Copy the **Checkout Link** (looks like: `https://yourstore.lemonsqueezy.com/checkout/buy/abc123`)

### 3e. Configure Website

1. Create `packages/website/.env` file:

```bash
VITE_LEMON_SQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/abc123
```

### 3f. Test Purchase Flow

1. Enable **Test Mode** in Lemon Squeezy dashboard
2. Make a test purchase using test card: `4242 4242 4242 4242`
3. Verify you receive email with license key
4. Test activating the license in the desktop app
5. Disable Test Mode when ready for production

---

## 4. Set Up Professional Email

**What:** Create support@carvd-studio.com (or similar) for customer support.

### Option A: Cloudflare Email Routing (FREE - Recommended)

If your domain is on Cloudflare:

1. Cloudflare Dashboard → Email → Email Routing
2. Click "Enable Email Routing"
3. Add routing rule:
   - Custom address: `support@carvd-studio.com`
   - Forward to: your personal email
4. Verify your personal email address
5. Done! Emails to support@ forward to your inbox

### Option B: Google Workspace (~$6/month)

1. Go to https://workspace.google.com
2. Sign up with your domain
3. Follow DNS verification steps
4. Create support@carvd-studio.com mailbox

### Option C: Zoho Mail (Free tier)

1. Go to https://www.zoho.com/mail/
2. Sign up for free plan
3. Verify domain ownership
4. Create mailbox

**After setup, update these files:**

- `packages/website/src/pages/HomePage.tsx` - Footer support link
- `packages/desktop/src/renderer/src/components/AboutModal.tsx` - Contact email

---

## 5. Set Up Analytics

**What:** Track website visitors to understand traffic sources and popular pages.

### Recommended: Plausible Analytics (~$9/month, privacy-friendly)

#### 5a. Sign Up

1. Go to https://plausible.io
2. Create account and add your site: `carvd-studio.com`

#### 5b. Add Script to Website

Edit `packages/website/index.html`, add before `</head>`:

```html
<script
  defer
  data-domain="carvd-studio.com"
  src="https://plausible.io/js/script.js"
></script>
```

#### 5c. Verify

1. Deploy website
2. Visit your site
3. Check Plausible dashboard for the visit

### Alternative: Fathom Analytics

- Similar setup, also privacy-friendly
- https://usefathom.com

---

## 6. GitHub Releases (Automated) ✅

**Status:** Automated via `.github/workflows/release.yml`.

When code is merged to `main`, the release workflow:

1. Reads the version from `packages/desktop/package.json`
2. Checks if a release already exists for that version (skips if so)
3. Creates a git tag
4. Builds for macOS (x64 + arm64, code-signed + notarized) and Windows
5. Creates a GitHub Release with DMG, ZIP, and EXE artifacts
6. Updates `VITE_APP_VERSION` in Vercel and triggers a production redeploy
7. Creates a version bump PR targeting `develop`

**To make a new release:**

```bash
# On develop, bump the version
cd packages/desktop
node scripts/version-bump.cjs patch  # or minor, major

# Or merge a PR that bumps the version, then merge develop → main
```

**Current state (v0.1.9):**

- macOS: Code-signed (Developer ID Application) + notarized by Apple — Gatekeeper allows the app
- Windows: Build works, no code signing yet (shows SmartScreen warning)
- Vercel update: All secrets configured (TOKEN + ORG_ID + PROJECT_ID); workflow updates env var + triggers redeploy

---

## 7. Pre-Launch Testing Checklist

### Desktop App Testing

- [ ] Fresh install on macOS - app launches, no errors
- [ ] Fresh install on Windows - app launches, no errors
- [ ] License activation with test key works
- [ ] License deactivation works
- [ ] Trial shows 14 days remaining on fresh install
- [ ] Trial expiration behavior correct (shows upgrade prompt)
- [ ] Free mode restrictions work (part limits, etc.)
- [ ] File save/load works correctly
- [ ] PDF export generates valid PDF
- [ ] CSV export generates valid CSV
- [ ] All keyboard shortcuts work
- [ ] Auto-update notification appears (if applicable)

### Website Testing

- [ ] All pages load without errors
- [ ] Download buttons link to correct files
- [ ] Download files actually download
- [ ] "Buy License" button opens Lemon Squeezy checkout
- [ ] Mobile responsive - test on phone
- [ ] All links work (no 404s)
- [ ] Social share preview works (paste URL in Twitter/Facebook)

### Accessibility Testing

- [ ] Tab through entire app - focus visible
- [ ] All buttons reachable via keyboard
- [ ] Test with VoiceOver (macOS) or NVDA (Windows)

---

## Quick Reference: File Locations

| Item                 | Location                                                      |
| -------------------- | ------------------------------------------------------------- |
| Website homepage     | `packages/website/src/pages/HomePage.tsx`                     |
| Website styles       | `packages/website/src/index.css`                              |
| Website env vars     | `packages/website/.env`                                       |
| Website public files | `packages/website/public/`                                    |
| Desktop app version  | `packages/desktop/package.json`                               |
| Desktop About modal  | `packages/desktop/src/renderer/src/components/AboutModal.tsx` |

---

## Completed Items

These have already been done:

- [x] Accessibility: Focus states for keyboard navigation
- [x] Accessibility: ARIA labels for screen readers
- [x] Open source license attribution (THIRD_PARTY_LICENSES.txt)
- [x] Website CSS updated to match desktop app colors
- [x] Download section added to homepage
- [x] BuyButton simplified for single product
- [x] Lemon Squeezy utility simplified (single checkout URL)
- [x] SEO meta tags added (Open Graph, Twitter Cards)
- [x] sitemap.xml created
- [x] robots.txt created
- [x] Trial messaging updated throughout website
- [x] Documentation page completely rewritten with accurate, comprehensive content
- [x] False feature claims removed (parametric design, joinery templates)
- [x] All keyboard shortcuts verified against actual code
- [x] Trial duration corrected to 14 days across all pages
- [x] System requirements standardized across DocsPage and DownloadPage
- [x] Keyboard shortcut conflicts resolved
- [x] Table of contents added to DocsPage for navigation
- [x] Feature limits documented accurately (free vs trial vs licensed)
- [x] Release workflow automated (macOS + Windows builds, GitHub Release creation)
- [x] v0.1.0 released with artifacts on both platforms
- [x] Website SPA routing fixed (vercel.json rewrite rules)
- [x] Dependabot configured to target develop branch
- [x] Version bump automation (PR created after each release)
- [x] macOS code signing working (Developer ID Application certificate)
- [x] macOS notarization working (Apple notarytool via @electron/notarize afterSign hook)
- [x] v0.1.1 released with code-signed, notarized macOS builds
- [x] E2E tests (Playwright happy path for Electron app)
- [x] Windows E2E tests added to CI (Playwright on windows-latest)
- [x] Changelog page on website (auto-generated from CHANGELOG.md via Vite virtual module)
- [x] Vercel ignoreCommand fixed (was skipping all builds including main)
- [x] Vercel auto-redeploy after release (workflow triggers redeploy via API after updating env var)
- [x] Website download URLs verified working (correct filenames match GitHub Release assets)
- [x] React 19 upgrade (from React 18)
- [x] Three.js ecosystem upgrade (@react-three/fiber v9, drei v10, three.js v0.182)
- [x] Security vulnerabilities resolved (14 Dependabot alerts)
- [x] Website emojis replaced with lucide-react icons + custom brand SVGs
- [x] Pre-commit hooks (husky + lint-staged + prettier)
- [x] GitHub Issue Templates (bug report + feature request YAML forms)
- [x] PR template with checklist
- [x] Changelog CI check (PRs to main require CHANGELOG.md changes)
- [x] `.nvmrc` for Node version pinning (Node 22)
- [x] `.editorconfig` for consistent editor settings
- [x] Website CI checks (typecheck + format) added to test workflow
- [x] Dependabot configured for website package
- [x] Branch protection enforced for admins on both develop and main
