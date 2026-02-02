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
- **Vercel** (recommended - same as webhook service)
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
- `/docs` - Documentation and guides

## TODO

- [ ] Complete features page with screenshots
- [ ] Add pricing information and Lemon Squeezy integration
- [ ] Create comprehensive documentation
- [ ] Add download links for macOS/Windows
- [ ] Add testimonials section
- [ ] Add blog/changelog section
- [ ] SEO optimization
- [ ] Analytics integration
