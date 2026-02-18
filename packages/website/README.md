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
