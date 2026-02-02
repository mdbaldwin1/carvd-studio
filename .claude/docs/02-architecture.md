# Architecture - Carvd Studio

## Monorepo Structure

Carvd Studio uses npm workspaces to manage three packages in a single repository.

```
carvd-studio/  (root)
├── packages/
│   ├── desktop/        → @carvd/desktop
│   ├── webhook/        → @carvd/webhook
│   └── website/        → @carvd/website
├── package.json        → Root workspace configuration
├── license-private-key.pem  → RSA-2048 private key (gitignored)
├── README.md
└── MONOREPO-MIGRATION.md
```

## Package Details

### 1. Desktop App (`packages/desktop/`)

**Purpose:** Main Electron application for furniture design

**Tech Stack:**
- Electron 28.3.3
- React 18
- TypeScript
- Three.js (React Three Fiber)
- Zustand (state management)
- zundo (undo/redo middleware)
- electron-store (persistence)
- electron-vite (build tool)
- electron-builder (packaging)

**Output:**
- macOS: DMG installer
- Windows: NSIS installer

**Key Commands:**
```bash
npm run dev:desktop          # Development with hot reload
npm run build:desktop        # Build production bundle
npm run package:mac          # Create macOS DMG
npm run package:win          # Create Windows installer
npm run generate-test-license  # Generate test license for dev
```

**Directory Structure:**
```
packages/desktop/
├── src/
│   ├── main/              → Electron main process
│   │   ├── index.ts       → Window creation, IPC, menu
│   │   ├── store.ts       → electron-store config
│   │   ├── license.ts     → License verification
│   │   └── keys.ts        → RSA public key
│   ├── preload/           → Preload script
│   │   └── index.ts       → Safe API bridge
│   └── renderer/          → React app
│       └── src/
│           ├── App.tsx    → Main component
│           ├── store/     → Zustand stores
│           ├── components/ → React components
│           ├── hooks/     → Custom hooks
│           ├── utils/     → Utilities
│           ├── types.ts   → TypeScript interfaces
│           ├── constants.ts
│           └── index.css  → ALL STYLES HERE
├── scripts/
│   ├── generate-license-keys.cjs
│   ├── generate-test-license.cjs
│   └── notarize.cjs
├── build/
│   └── entitlements.mac.plist
├── electron.vite.config.ts
└── package.json
```

### 2. Webhook Service (`packages/webhook/`)

**Purpose:** Serverless function for automated license key generation

**Tech Stack:**
- Node.js
- Vercel Serverless Functions
- jsonwebtoken (JWT signing)

**Deployment:**
- Platform: Vercel
- Trigger: Lemon Squeezy purchase webhooks
- Environment Variables:
  - `LICENSE_PRIVATE_KEY` - RSA-2048 private key (PEM format)
  - `LEMON_SQUEEZY_WEBHOOK_SECRET` - Webhook signature verification

**Workflow:**
1. Customer purchases via Lemon Squeezy
2. Lemon Squeezy sends webhook to Vercel function
3. Function verifies webhook signature
4. Function generates JWT license key (signed with private key)
5. License key returned to Lemon Squeezy
6. Lemon Squeezy emails license key to customer

**Key Commands:**
```bash
npm run dev:webhook          # Local development (vercel dev)
npm run deploy:webhook       # Deploy to Vercel production
node test-webhook.js         # Test license generation locally
```

**Directory Structure:**
```
packages/webhook/
├── api/
│   └── webhook.js         → Serverless function handler
├── test-webhook.js        → Local test script
├── vercel.json            → Vercel config
├── package.json
├── README.md
└── QUICKSTART.md          → 5-minute deployment guide
```

### 3. Website (`packages/website/`)

**Purpose:** Marketing and documentation website

**Tech Stack:**
- React 18
- TypeScript
- Vite
- Tailwind CSS (**Only package that uses Tailwind**)
- React Router

**Pages:**
- Home (hero, features grid)
- Features (detailed showcase)
- Pricing (Lemon Squeezy integration)
- Documentation (user guides)

**Deployment:**
- Platform: Vercel
- Type: Static site

**Key Commands:**
```bash
npm run dev:website          # Development server
npm run build:website        # Build static site
npm run deploy:website       # Deploy to Vercel
```

**Directory Structure:**
```
packages/website/
├── src/
│   ├── App.tsx            → React Router setup
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── FeaturesPage.tsx
│   │   ├── PricingPage.tsx
│   │   └── DocsPage.tsx
│   └── index.css          → Tailwind imports
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Tech Stack Breakdown

### Desktop App Stack

**Electron Layer:**
- Main process: Window management, IPC, native menus, file system
- Preload: Secure bridge between main and renderer
- Renderer: React app in BrowserWindow

**React Layer:**
- React 18 with TypeScript
- Three.js via React Three Fiber for 3D rendering
- Lucide React for icons

**State Management:**
- Zustand for global state
- zundo middleware for undo/redo
- electron-store for persistence
- Custom hooks for IPC communication

**Build & Package:**
- electron-vite: Fast Vite-based bundler
- electron-builder: Creates installers
- Code signing ready (macOS notarization configured)

### License System

**Architecture:** RSA-2048 asymmetric cryptography

**Components:**
- Private key (webhook): Signs license keys
- Public key (desktop): Verifies licenses offline
- License format: JWT tokens

**License Data:**
```typescript
{
  email: string;
  orderId: string;
  product: string;
  licenseType: 'lifetime';
  iat: number;  // issued at timestamp
}
```

**Security:**
- Offline verification (no server dependency)
- Private key never leaves server (gitignored, only on Vercel)
- Public key embedded in desktop app
- Signature verification prevents tampering

## Key File Reference

### Renderer Process (Desktop)

| File | Purpose |
|------|---------|
| `App.tsx` | Main component, sidebar, properties panel, canvas |
| `store/projectStore.ts` | Project state with undo/redo |
| `store/appSettingsStore.ts` | App-level settings |
| `hooks/useKeyboardShortcuts.ts` | Global shortcuts |
| `hooks/useStockLibrary.ts` | Stock library with cross-instance sync |
| `hooks/useCompositeStockLibrary.ts` | Composite library |
| `hooks/useFileOperations.ts` | Save/load/new project |
| `hooks/useAutoRecovery.ts` | Crash recovery |
| `hooks/useMenuCommands.ts` | Native menu handling |
| `hooks/useCompositeEditing.ts` | Edit composites in 3D |
| `components/Part.tsx` | 3D part rendering, handles, grain |
| `components/Workspace.tsx` | 3D scene, grid, camera |
| `components/StockLibraryModal.tsx` | Tabbed library manager |
| `components/CutListModal.tsx` | Cut list, diagrams, shopping |
| `components/HierarchicalPartsList.tsx` | Sidebar parts tree |
| `types.ts` | All TypeScript interfaces |
| `constants.ts` | STOCK_COLORS, grid constants |
| `utils/fractions.ts` | Fraction math, unit conversion |
| `utils/snapToPartsUtil.ts` | Snap-to-parts detection |
| `utils/cutListOptimizer.ts` | Guillotine bin-packing |
| `index.css` | **ALL STYLES** |

### Main Process (Desktop)

| File | Purpose |
|------|---------|
| `index.ts` | Window creation, IPC, menu, sync |
| `store.ts` | electron-store with file watching |
| `license.ts` | License verification logic |
| `keys.ts` | RSA public key |

### Build Configuration (Desktop)

| File | Purpose |
|------|---------|
| `electron.vite.config.ts` | Vite build config |
| `package.json` | Dependencies, scripts, electron-builder |
| `scripts/generate-license-keys.cjs` | Generate RSA keypair |
| `scripts/generate-test-license.cjs` | Test licenses |
| `scripts/notarize.cjs` | macOS notarization |
| `build/entitlements.mac.plist` | Hardened runtime |

## Data Flow

### User Actions → State Updates

```
User Action (UI)
  ↓
Event Handler (Component)
  ↓
Store Action (Zustand)
  ↓
State Update (Immutable)
  ↓
Component Re-render (React)
  ↓
Visual Update (Three.js)
```

### File Operations

```
Save:
  projectStore state → serializeProject() → JSON → fs.writeFile → .carvd file

Load:
  .carvd file → fs.readFile → JSON → deserializeToProject() → loadProject()
```

### Cross-Instance Sync

```
Window A: Setting Change
  ↓
electron-store write
  ↓
File system change (settings.json)
  ↓
electron-store watch event
  ↓
IPC broadcast to all windows
  ↓
Window B: Setting Update
```

## Build & Distribution

### Development Workflow

```bash
# Install dependencies
npm install

# Run desktop app in dev mode
npm run dev:desktop

# Run website dev server
npm run dev:website

# Test webhook locally
npm run dev:webhook
```

### Production Build

```bash
# Build desktop app
npm run build:desktop

# Create installers
npm run package:mac    # macOS DMG
npm run package:win    # Windows NSIS

# Deploy webhook
npm run deploy:webhook

# Deploy website
npm run deploy:website
```

### Code Signing

**macOS:**
- Configuration: `electron-builder` in package.json
- Entitlements: `build/entitlements.mac.plist`
- Notarization: `scripts/notarize.cjs` (uses @electron/notarize)
- Requires: Apple Developer account, certificates

**Windows:**
- Configuration: Ready in `electron-builder`
- Requires: Code signing certificate

## Performance Considerations

### Snap Detection Optimization

- Limits checks to N nearest parts (not all parts)
- Uses axis-aligned bounding boxes (AABB) for fast intersection
- Caches part bounds during drag operations

### Cut List Optimization

- Best Fit Decreasing algorithm (largest parts first)
- Guillotine bin-packing for rectangular cuts
- Respects grain direction constraints

### 3D Rendering

- React Three Fiber manages Three.js lifecycle
- Part meshes reused when possible
- Only selected parts show handles (reduces draw calls)

### State Updates

- Zustand with immer for immutable updates
- Undo/redo limited to 100 history entries
- Debounced auto-recovery saves (2 minute interval)

---

**Architecture Principle:** Keep it simple. No over-engineering. Offline-first, user-focused, maintainable.
