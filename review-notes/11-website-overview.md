# Website: Comprehensive Review

**Created:** 2026-02-14
**Status:** 🟡 MODERATE IMPROVEMENTS NEEDED
**Reviewer:** Claude
**Priority:** MEDIUM

## Executive Summary

The website is in **better shape than the desktop app** but has similar issues:

- Monster DocsPage component (2,314 lines)
- Large but better-organized CSS file (2,092 lines)
- Needs actual screenshots (currently using placeholders)
- SEO and content accuracy need verification

### Severity Breakdown

- 🔴 **Critical:** 1 issue (missing screenshots)
- 🟡 **Medium:** 3 issues (DocsPage size, CSS organization, content accuracy)
- 🟢 **Low:** 2 issues (SEO verification, mobile testing)

---

## Critical Issues

### 1. 🔴 Missing Screenshots / Placeholder Images

**Issue:** Website uses `<ScreenshotPlaceholder>` components instead of actual product images

**Current State:**

- HomePage, FeaturesPage, DocsPage use placeholders
- No actual product screenshots
- Tooltips indicate what screenshots are needed
- This makes the website look incomplete/unprofessional

**Impact:** 🔴 CRITICAL - Users can't see what the product looks like!

**Screenshots Needed:**

1. **Hero Screenshot** (HomePage)
   - Main 3D workspace with furniture project
   - Show cabinet or bookshelf with multiple parts

2. **Feature Screenshots** (FeaturesPage)
   - 3D visualization
   - Cut list optimization
   - Stock library
   - Assembly management
   - Group organization
   - Real-time measurements

3. **Documentation Screenshots** (DocsPage)
   - Interface overview
   - Parts sidebar
   - Context menu
   - Settings modal
   - Stock library modal
   - Cut list modal

**Recommendation:**

1. Capture high-quality screenshots from desktop app
2. Consider product video/demo
3. Use consistent style (lighting, project example)
4. Optimize images for web (WebP format, lazy loading)

**Estimated Effort:** 1-2 days (capture + optimize + replace placeholders)

---

## Medium Priority Issues

### 2. 🟡 Monster DocsPage Component (2,314 lines)

**File:** `packages/website/src/pages/DocsPage.tsx`
**Lines:** 2,314 lines 🚨

**Issue:** Entire documentation in single component

**Problems:**

1. Unmaintainable and hard to navigate
2. Large initial bundle size
3. No code splitting
4. Difficult to update specific sections
5. Poor SEO (single page, not crawlable sections)

**Impact:** 🟡 MEDIUM - Hurts performance and maintainability

**Recommendation: Split into Multiple Pages**

**Proposed Structure:**

```
pages/
  └── docs/
      ├── DocsLayout.tsx (shared layout with sidebar nav)
      ├── index.tsx (overview/introduction)
      ├── QuickStartPage.tsx
      ├── InterfaceOverviewPage.tsx
      ├── FirstProjectPage.tsx
      ├── PartsGuidePage.tsx
      ├── StockMaterialsPage.tsx
      ├── GroupsPage.tsx
      ├── AssembliesPage.tsx
      ├── CutListPage.tsx
      ├── TemplatesPage.tsx
      ├── KeyboardShortcutsPage.tsx
      └── SettingsPage.tsx
```

**Benefits:**

1. **Better SEO**
   - Each page is crawlable URL
   - Better for search engine ranking
   - Can target specific keywords

2. **Better Performance**
   - Code splitting (only load needed page)
   - Faster initial load
   - Better Core Web Vitals

3. **Better UX**
   - Shareable URLs to specific sections
   - Browser back/forward navigation
   - Clearer navigation structure

4. **Better Maintainability**
   - Each page manageable size
   - Easy to update specific sections
   - Clear organization

**Estimated Effort:** 3-5 days (split component + update routing + test)

---

### 3. 🟡 Large CSS File (2,092 lines)

**File:** `packages/website/src/index.css`
**Lines:** 2,092 lines

**Issue:** All CSS in one file (but better organized than desktop)

**Positive Aspects:**
✅ Well-structured with comments and sections
✅ Good use of CSS custom properties (design tokens)
✅ Consistent naming (follows design system)
✅ Clear section organization

**Problems:**

1. Still difficult to navigate (2,092 lines)
2. No component-scoped styles
3. Global namespace (potential conflicts)
4. No code splitting

**Impact:** 🟡 MEDIUM - Less critical than desktop, but still improvable

**Recommendation:**
Same options as desktop:

- **Option A:** CSS Modules (component-scoped)
- **Option B:** Tailwind CSS (utility-first, highly recommended)
- **Option C:** Styled Components (CSS-in-JS)

**Note:** Website CSS is MUCH better organized than desktop. This is lower priority.

**Estimated Effort:** 2-3 weeks (if migrating to Tailwind)

---

### 4. 🟡 Content Accuracy Verification Needed

**Issue:** Need to verify website accurately reflects desktop app features

**Tasks:**

1. **Feature Parity Check**
   - Does FeaturesPage list all desktop features?
   - Are any features overstated?
   - Are any features understated?

2. **Documentation Accuracy**
   - Does DocsPage match actual app behavior?
   - Are keyboard shortcuts correct?
   - Are settings descriptions accurate?
   - Are workflows described correctly?

3. **Pricing Accuracy**
   - Do pricing tiers match feature limits?
   - Is trial information accurate?
   - Are purchase details correct?

4. **Support Content**
   - Are FAQs accurate?
   - Do support instructions match actual app?

**Impact:** 🟡 MEDIUM - Inaccurate content erodes trust

**Recommendation:**

1. Go through website page by page
2. Verify against desktop app v0.1.14
3. Update any inaccuracies
4. Add missing features
5. Remove overstated capabilities

**Estimated Effort:** 2-3 days (thorough review + updates)

---

## Low Priority Issues

### 5. 🟢 SEO Verification Needed

**Issue:** Need to verify SEO implementation

**Items to Check:**

1. Meta tags (title, description) on all pages
2. Open Graph tags for social sharing
3. Structured data (JSON-LD) for rich results
4. Sitemap.xml generation
5. Robots.txt configuration
6. Image alt text
7. Semantic HTML (h1, h2, nav, main, etc.)
8. Page load performance (Core Web Vitals)

**Current State:** Needs investigation

**Impact:** 🟢 LOW - Site is functional, but SEO could be better

**Recommendation:**

1. Run Lighthouse audit
2. Use Google Search Console
3. Check meta tags on all pages
4. Verify social sharing preview
5. Test on PageSpeed Insights

**Estimated Effort:** 2-3 days (audit + fixes)

---

### 6. 🟢 Mobile Responsiveness Testing

**Issue:** Need thorough mobile testing

**Items to Test:**

1. Navigation menu on mobile
2. Buttons and forms (touch targets)
3. Screenshots/images (responsive)
4. Typography (readable sizes)
5. Pricing tables (horizontal scroll?)
6. Documentation sidebar (hamburger menu?)

**Impact:** 🟢 LOW - Likely works but needs verification

**Recommendation:**

- Test on actual devices (iOS, Android)
- Use Chrome DevTools device emulation
- Test various viewport sizes
- Verify touch interactions

**Estimated Effort:** 1-2 days

---

## Positive Aspects

✅ **Well-Organized CSS:** Better structure than desktop app
✅ **Design System:** Clear design tokens and spacing scale
✅ **TypeScript:** Strong typing throughout
✅ **Good Routing:** React Router v7 for navigation
✅ **Analytics:** Vercel Analytics integrated
✅ **Testing:** Unit tests for utilities and components
✅ **Component Structure:** Reasonable page sizes (except DocsPage)
✅ **Buy Button:** LemonSqueezy integration for payments

---

## Website Structure Review

### Pages (10 pages)

1. **HomePage.tsx** (440 lines) ✅ Reasonable
2. **FeaturesPage.tsx** (437 lines) ✅ Reasonable
3. **PricingPage.tsx** (558 lines) ✅ Reasonable
4. **DocsPage.tsx** (2,314 lines) 🚨 TOO LARGE
5. **DownloadPage.tsx** (401 lines) ✅ Reasonable
6. **SupportPage.tsx** (621 lines) ⚠️ Large but acceptable
7. **ChangelogPage.tsx** (169 lines) ✅ Good
8. **PrivacyPolicyPage.tsx** (278 lines) ✅ Good
9. **TermsPage.tsx** (306 lines) ✅ Good
10. **NotFoundPage.tsx** (tiny) ✅ Good

**Overall:** Good sizes except DocsPage

### Components (6 components)

1. **BuyButton** - LemonSqueezy integration ✅
2. **ScreenshotPlaceholder** - Temporary, needs real images 🚨
3. **ScrollToHash** - Smooth scroll to anchors ✅
4. **BrandIcons** - Apple/Windows icons ✅

**Overall:** Minimal components, could use more reusable primitives

### Utils (3 utilities)

1. **changelogParser** - Parse CHANGELOG.md ✅
2. **downloads** - Get download URLs ✅
3. **lemonSqueezy** - Payment integration ✅

**Overall:** Good, well-tested

---

## Content Quality Review

### Hero Section (HomePage)

**Headline:** "Stop Wasting Wood. Start Building Smarter."

- ✅ Clear value proposition
- ✅ Addresses pain point (wasting material)
- ✅ Action-oriented

**Subheadline:** "Professional furniture design software..."

- ✅ Describes product
- ✅ Highlights key benefits
- ✅ Mentions offline-first

**Call-to-Action:**

- ✅ "Download Free Trial" prominent
- ✅ "See Pricing" secondary action
- ✅ Trial details clear (14 days, one-time payment)

**Overall:** Strong hero section ✅

### Features Section

**Need to verify:**

- [ ] All listed features exist in desktop app
- [ ] Features are accurately described
- [ ] No overstated capabilities
- [ ] No missing major features

### Pricing Section

**Need to verify:**

- [ ] Free tier limits match actual limits
- [ ] Pro tier features match actual features
- [ ] Pricing is current ($39?)
- [ ] Trial details accurate

### Documentation

**Need to verify:**

- [ ] All workflows are accurate
- [ ] Keyboard shortcuts are correct
- [ ] Screenshots show current UI (when added)
- [ ] Settings descriptions match app

---

## SEO Considerations

### Current URLs

- `/` - Homepage ✅
- `/features` - Features ✅
- `/pricing` - Pricing ✅
- `/docs` - Documentation (should be split)
- `/download` - Download ✅
- `/support` - Support ✅
- `/changelog` - Changelog ✅
- `/privacy` - Privacy Policy ✅
- `/terms` - Terms of Service ✅

**Issues:**

- `/docs` is single page (bad for SEO)
- Should be `/docs/quick-start`, `/docs/parts`, etc.

### Recommended URL Structure

```
/docs/                    # Overview
/docs/quick-start         # Quick start guide
/docs/interface           # Interface overview
/docs/parts               # Working with parts
/docs/stock               # Stock materials
/docs/groups              # Groups & organization
/docs/assemblies          # Assembly management
/docs/cut-list            # Cut list optimization
/docs/templates           # Templates
/docs/keyboard-shortcuts  # Keyboard shortcuts
/docs/settings            # Settings & preferences
```

**Benefits:**

- Each page can rank for specific keywords
- Better user experience (shareable URLs)
- Easier to maintain and update

---

## Performance Considerations

### Bundle Size

**Need to verify:**

- Total JavaScript bundle size
- CSS bundle size
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)

**Recommendations:**

- Code split by route (React.lazy)
- Lazy load images
- Use WebP format for images
- Minify and compress assets
- Use CDN for static assets (Vercel does this)

### Current Issues:

- DocsPage likely causes large bundle (2,314 lines)
- Missing images (placeholders) affect layout shift

---

## Accessibility Considerations

**Need to verify:**

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text for images (when added)
- [ ] ARIA labels where needed
- [ ] Semantic HTML elements
- [ ] Screen reader testing

**Estimated Effort:** 1-2 days (audit + fixes)

---

## Recommended Action Plan

### Phase 1: Critical Fixes (1 Week)

1. **Capture and add screenshots** (2 days)
   - Main workspace
   - Feature screenshots
   - Documentation screenshots

2. **Verify content accuracy** (2 days)
   - Check all features against desktop app
   - Update any inaccuracies
   - Ensure pricing/trial info is correct

3. **Split DocsPage** (3 days)
   - Break into separate pages
   - Set up routing
   - Update navigation

### Phase 2: SEO & Performance (1 Week)

1. **SEO audit and fixes** (2 days)
   - Add/verify meta tags
   - Test social sharing
   - Check sitemap

2. **Performance optimization** (2 days)
   - Lighthouse audit
   - Image optimization
   - Code splitting

3. **Mobile testing** (2 days)
   - Test on real devices
   - Fix any responsive issues
   - Verify touch interactions

### Phase 3: Polish (Optional)

1. **Accessibility audit** (2 days)
2. **Consider Tailwind migration** (2-3 weeks)
3. **Add more reusable components** (ongoing)

---

## Questions for Team Discussion

1. **Screenshots:** Who will capture product screenshots?
2. **DocsPage:** Priority to split into separate pages?
3. **CSS Migration:** Worth migrating to Tailwind?
4. **Video:** Should we create a product demo video?
5. **Blog:** Should we add a blog for content marketing?

---

## Metrics to Track

After improvements:

- Lighthouse score (aim for 90+)
- Core Web Vitals (green)
- Bounce rate (lower is better)
- Time on site (higher is better)
- Conversion rate (trial downloads)
- Organic search traffic

---

## Related Review Documents

- `09-desktop-styling.md` - Similar CSS issues, can share solution
- `12-website-seo-marketing.md` - Detailed SEO review (to be created)
- `13-website-ux-design.md` - UX/design review (to be created)

---

## Status

- [x] Initial review completed
- [ ] Screenshots captured and added
- [ ] Content accuracy verified
- [ ] DocsPage split into separate pages
- [ ] SEO audit completed
- [ ] Performance optimized
- [ ] Mobile testing completed
- [ ] Accessibility audit completed

**Next Step:** Capture product screenshots and replace placeholders
