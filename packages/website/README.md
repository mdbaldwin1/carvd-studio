# Carvd Studio Website

Marketing and documentation website for Carvd Studio.

## Tech Stack

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing

## Development

```bash
# Install dependencies (from root)
npm install

# Start dev server
npm run dev --workspace=@carvd/website

# Or from this directory
cd packages/website
npm run dev
```

The site will be available at http://localhost:3000

## Build

```bash
npm run build --workspace=@carvd/website
```

## Analytics configuration

`VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` enable optional public website analytics; blank keys are no-ops. Use separate development and production projects. `src/analytics` owns `$pageview`, `download_clicked`, and `checkout_started`; `api/webhooks/lemonsqueezy.ts` owns `purchase_completed`; `packages/desktop/src/shared/analytics.ts` owns desktop events. Server webhook variables are `LEMON_SQUEEZY_WEBHOOK_SECRET`, `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST`, and `ANALYTICS_ID_SALT`; subscribe only to `order_created`. Clear `VITE_POSTHOG_KEY` in Vercel to stop website delivery. Desktop consent defaults off; revoking it deletes queued analytics and its anonymous identifier.

## Deployment

This website can be deployed to:

- **Vercel** (recommended)
- **Netlify**
- **Cloudflare Pages**
- Any static hosting service

For Vercel deployment:

```bash
cd packages/website
vercel --prod
```

## Pages

- `/` - Home page with hero and features
- `/features` - Detailed features showcase
- `/pricing` - Pricing and purchase information
- `/download` - Platform-specific download links (version auto-updated)
- `/docs` - Documentation hub with guides:
  - `/docs/quick-start` - Getting started
  - `/docs/interface` - Interface overview
  - `/docs/first-project` - First project tutorial
  - `/docs/parts` - Working with parts
  - `/docs/stock` - Stock materials
  - `/docs/groups` - Groups and hierarchy
  - `/docs/cut-lists` - Cut list generation
  - `/docs/assemblies` - Assemblies
  - `/docs/templates` - Templates
  - `/docs/snapping` - Snapping and alignment
  - `/docs/joinery` - Joinery techniques
  - `/docs/shortcuts` - Keyboard shortcuts
  - `/docs/settings` - Settings reference
  - `/docs/requirements` - System requirements
  - `/docs/troubleshooting` - Troubleshooting
  - `/docs/faq` - FAQ
- `/support` - Support and contact
- `/changelog` - Release changelog (auto-generated from CHANGELOG.md)
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## TODO

- [ ] Complete features page with screenshots
- [ ] Set up Lemon Squeezy product and configure checkout URL
- [ ] Add testimonials section
