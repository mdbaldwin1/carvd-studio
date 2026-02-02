# Carvd Studio Desktop App

Offline desktop application for designing custom furniture and cabinetry with 3D visualization.

## Features

- **3D Visualization** - Real-time 3D rendering with Three.js
- **Hierarchical Organization** - Group and organize parts
- **Stock Management** - Define and assign stock materials
- **Cut List Generation** - Optimized cutting diagrams with waste tracking
- **PDF Export** - Professional cut lists and shopping lists
- **License Verification** - Offline JWT-based licensing
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
│   │   ├── keys.ts        → Public key for license verification
│   │   └── store.ts       → Persistent storage (electron-store)
│   ├── renderer/          → React UI
│   │   └── src/
│   │       ├── components/     → React components
│   │       ├── hooks/          → Custom hooks
│   │       ├── stores/         → Zustand stores
│   │       ├── types/          → TypeScript types
│   │       └── utils/          → Utilities
│   └── preload/           → Preload scripts (IPC bridge)
├── build/                 → Build assets (icons, entitlements)
├── scripts/               → Build and signing scripts
├── out/                   → Compiled output
└── dist/                  → Packaged installers
```

## License System

This app uses offline license verification:

1. License keys are JWT tokens signed with RSA-2048
2. Public key is embedded in the app ([src/main/keys.ts](src/main/keys.ts))
3. Verification happens locally (no phone-home)
4. License data stored in electron-store

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

## Tech Stack

- **Electron** 28 - Desktop framework
- **React** 18 - UI library
- **TypeScript** 5 - Type safety
- **Three.js** - 3D rendering
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Three.js helpers
- **Zustand** - State management
- **Zundo** - Undo/redo middleware
- **electron-store** - Persistent storage
- **jsonwebtoken** - License verification
- **jsPDF** - PDF export
- **Vite** - Build tool (via electron-vite)

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
- [Webhook Service](../webhook/README.md)
- [Website](../website/README.md)
