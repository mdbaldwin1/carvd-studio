# Carvd Studio

Professional furniture and cabinetry design software with 3D visualization and optimized cut lists.

## Monorepo Structure

This repository contains three packages:

```
carvd-studio/
├── packages/
│   ├── desktop/        → Electron desktop application (macOS/Windows)
│   ├── webhook/        → Lemon Squeezy webhook for license generation (Vercel)
│   └── website/        → Marketing and documentation website (Vercel)
├── package.json        → Root workspace configuration
├── license-private-key.pem  → RSA private key (gitignored, shared)
└── README.md           → This file
```

## Quick Start

### Install Dependencies

```bash
# Install all packages at once
npm install
```

### Development

```bash
# Run desktop app
npm run dev:desktop

# Run website locally
npm run dev:website

# Test webhook locally
npm run dev:webhook
```

### Building

```bash
# Build desktop app
npm run build:desktop

# Package desktop app for distribution
npm run package:mac    # macOS DMG
npm run package:win    # Windows installer

# Build website for deployment
npm run build:website
```

### Deployment

```bash
# Deploy webhook service
npm run deploy:webhook

# Deploy website
npm run deploy:website
```

## Packages

### 📱 Desktop App ([packages/desktop](packages/desktop/))

Electron-based desktop application for designing custom furniture.

**Tech Stack**: Electron, React, TypeScript, Three.js, Zustand

**Features**:
- 3D visualization with real-time rendering
- Hierarchical part organization with groups
- Stock material management and assignment
- Optimized cut list generation
- PDF export with cut diagrams
- Offline license verification (JWT)
- Dark/Light/System themes
- Full undo/redo support

[See desktop README for details](packages/desktop/README.md)

### 🔗 Webhook Service ([packages/webhook](packages/webhook/))

Vercel serverless function that generates license keys when customers purchase through Lemon Squeezy.

**Tech Stack**: Node.js, Vercel Serverless Functions, JWT

**Features**:
- Receives Lemon Squeezy purchase webhooks
- Generates signed JWT license keys
- Webhook signature verification
- Automatic email delivery via Lemon Squeezy

[See webhook README for details](packages/webhook/README.md)

### 🌐 Website ([packages/website](packages/website/))

Marketing and documentation website.

**Tech Stack**: React, TypeScript, Vite, Tailwind CSS

**Features**:
- Product showcase and features
- Pricing information
- Documentation and guides
- Download links

[See website README for details](packages/website/README.md)

## License Key System

This project uses asymmetric cryptography (RSA-2048) for offline license verification:

1. **Private Key** (`license-private-key.pem`) - Generates license keys (webhook service)
2. **Public Key** (`packages/desktop/src/main/keys.ts`) - Verifies licenses (desktop app)

### Generate Keys

```bash
# Generate RSA keypair (first time setup)
npm run generate-keys

# Generate test license for development
npm run generate-test-license
```

**Security**: Never commit `license-private-key.pem` to git (already gitignored).

## Scripts

### Root Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all packages |
| `npm run dev:desktop` | Run desktop app in dev mode |
| `npm run dev:website` | Run website dev server |
| `npm run build:desktop` | Build desktop app |
| `npm run build:website` | Build website for production |
| `npm run package:mac` | Create macOS DMG installer |
| `npm run package:win` | Create Windows installer |
| `npm run deploy:webhook` | Deploy webhook to Vercel |
| `npm run deploy:website` | Deploy website to Vercel |
| `npm run lint` | Lint all packages |
| `npm run format` | Format all packages |
| `npm run clean` | Remove all node_modules and build artifacts |
| `npm run fresh-install` | Clean and reinstall everything |

## Development Workflow

### Working on Desktop App

```bash
cd packages/desktop
npm run dev
```

### Working on Website

```bash
cd packages/website
npm run dev
```

### Testing License System

```bash
# 1. Generate test license
npm run generate-test-license

# 2. Copy the license key output

# 3. Run desktop app
npm run dev:desktop

# 4. Paste license key in activation modal
```

## Deployment

### Desktop App Distribution

1. **macOS**:
   ```bash
   npm run package:mac
   # Output: packages/desktop/dist/Carvd Studio-0.1.0.dmg
   ```

2. **Windows**:
   ```bash
   npm run package:win
   # Output: packages/desktop/dist/Carvd Studio Setup 0.1.0.exe
   ```

### Webhook Service

```bash
cd packages/webhook
vercel --prod
```

Configure environment variables in Vercel dashboard:
- `LICENSE_PRIVATE_KEY` - Your RSA private key
- `LEMON_SQUEEZY_WEBHOOK_SECRET` - From Lemon Squeezy settings

[See webhook deployment guide](packages/webhook/QUICKSTART.md)

### Website

```bash
cd packages/website
vercel --prod
```

## Contributing

### Adding Dependencies

```bash
# Add to specific package
npm install <package> --workspace=@carvd/desktop
npm install <package> --workspace=@carvd/website
npm install <package> --workspace=@carvd/webhook

# Add to root (shared dev tools)
npm install <package> -D -w
```

### Code Style

- **TypeScript** for type safety
- **ESLint** for linting
- **Prettier** for formatting
- Run `npm run format` before committing

## Tech Stack

### Desktop
- **Electron** - Cross-platform desktop framework
- **React** - UI library
- **Three.js** - 3D rendering
- **Zustand** - State management
- **electron-store** - Persistent storage

### Webhook
- **Vercel** - Serverless hosting
- **jsonwebtoken** - JWT signing

### Website
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling

## License

ISC License - Copyright (c) 2026 Michael Baldwin

## Author

Michael Baldwin ([@mbaldwintech](https://github.com/mbaldwintech))
