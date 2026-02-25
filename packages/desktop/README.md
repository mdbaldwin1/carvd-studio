# Carvd Studio Desktop App

Offline desktop application for designing custom furniture and cabinetry with 3D visualization.

## Features

- **3D Visualization** - Real-time 3D rendering with Three.js
- **Hierarchical Organization** - Group and organize parts
- **Stock Management** - Define and assign stock materials
- **Cut List Generation** - Optimized cutting diagrams with waste tracking
- **PDF Export** - Professional cut lists and shopping lists
- **License Verification** - Lemon Squeezy API with 7-day offline cache
- **Themes** - Dark, Light, and System theme support
- **Undo/Redo** - Full history with Zundo
- **Offline First** - No internet required

## Development

```bash
# Install dependencies (from root)
npm install

# Run in development mode
npm run dev

# Or from this directory
npm run dev
```

## Building

```bash
# Build the app
npm run build

# Package for macOS
npm run package:mac

# Package for Windows
npm run package:win
```

## Project Structure

```
packages/desktop/
├── src/
│   ├── main/              → Electron main process
│   │   ├── index.ts       → Main entry point
│   │   ├── license.ts     → License verification
│   │   ├── lemonsqueezy-api.ts → Lemon Squeezy API client
│   │   ├── trial.ts       → Trial period logic
│   │   ├── keys.ts        → Public key for license verification
│   │   ├── menu.ts        → Application menu
│   │   ├── updater.ts     → Auto-update logic
│   │   └── store.ts       → Persistent storage (electron-store)
│   ├── renderer/          → React UI
│   │   └── src/
│   │       ├── components/     → React components
│   │       ├── hooks/          → Custom hooks
│   │       ├── store/          → Zustand stores
│   │       ├── types/          → TypeScript types
│   │       └── utils/          → Utilities
│   └── preload/           → Preload scripts (IPC bridge)
├── build/                 → Build assets (icons, entitlements)
├── scripts/               → Build and signing scripts
├── out/                   → Compiled output
└── dist/                  → Packaged installers
```

## License System

This app uses a freemium model with Lemon Squeezy for payments:

1. 14-day free trial with full features on first launch
2. License keys purchased through Lemon Squeezy checkout
3. Validation via Lemon Squeezy API with 7-day offline cache
4. License data stored in electron-store
5. Feature-limited free mode after trial expires (10 parts, 5 stocks, no PDF/optimizer/groups)

### Generate Test License

```bash
# From root
npm run generate-test-license

# Or from this directory
npm run generate-test-license
```

Copy the generated license key and paste it in the app's activation modal.

## Configuration

### Code Signing (macOS)

Update `package.json` build section with your Apple Developer ID:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### Notarization (macOS)

Set environment variables:

- `APPLE_ID` - Your Apple ID email
- `APPLE_ID_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Your team ID

```bash
export APPLE_ID="you@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAM123456"

npm run package:mac
```

### Lemon Squeezy Checkout URL

Set `VITE_LEMON_SQUEEZY_CHECKOUT_URL` to override the default purchase URL used by desktop upgrade prompts.

```bash
# from packages/desktop
cp .env.example .env
# then edit .env if needed
```

## Tech Stack

- **Electron** 40 - Desktop framework
- **React** 19 - UI library
- **TypeScript** 5 - Type safety
- **Three.js** 0.182 - 3D rendering
- **@react-three/fiber** 9 - React renderer for Three.js
- **@react-three/drei** 10 - Three.js helpers
- **Zustand** 5 - State management
- **Zundo** 2 - Undo/redo middleware
- **Tailwind CSS** 4 - Styling with CSS custom properties for theming
- **electron-store** - Persistent storage
- **jsPDF** - PDF export
- **Vite** 7 - Build tool (via electron-vite)

## Building for Production

### macOS

```bash
npm run package:mac
```

Output: `dist/Carvd Studio-{version}.dmg`

Requirements:

- macOS machine
- Apple Developer ID certificate (for distribution outside Mac App Store)
- Code signing identity configured

### Windows

```bash
npm run package:win
```

Output: `dist/Carvd Studio Setup {version}.exe`

Requirements:

- Windows machine or cross-compilation setup
- Code signing certificate (optional but recommended)

## Troubleshooting

### "ELECTRON_RUN_AS_NODE is not set" error

The `unset ELECTRON_RUN_AS_NODE` in scripts prevents issues with npm/node environments. This is normal.

### License verification fails

1. Make sure you generated keys: `npm run generate-keys`
2. Check that `license-private-key.pem` exists in root
3. Verify public key is in `src/main/keys.ts`
4. Generate fresh test license: `npm run generate-test-license`

### Build fails

```bash
# Clean and reinstall
cd ../..  # Back to root
npm run clean
npm install
```

## Distribution Checklist

Before releasing:

- [ ] Update version in `package.json`
- [ ] Test on clean macOS machine
- [ ] Test on clean Windows machine
- [ ] Verify license activation works
- [ ] Test file save/load
- [ ] Test cut list generation
- [ ] Test PDF export
- [ ] Verify code signing
- [ ] Test installer on target OS
- [ ] Update CHANGELOG

## Links

- [Monorepo Root README](../../README.md)
- [Website](../website/README.md)
