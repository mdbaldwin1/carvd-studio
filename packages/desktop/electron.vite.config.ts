import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

// Custom plugin to copy splash.html to output
const copySplashPlugin = () => ({
  name: 'copy-splash',
  closeBundle() {
    try {
      mkdirSync(resolve(__dirname, 'out/main'), { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/main/splash.html'),
        resolve(__dirname, 'out/main/splash.html')
      );
    } catch (e) {
      console.warn('Could not copy splash.html:', e);
    }
  }
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySplashPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/main/index.ts',
        },
        external: ['electron'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/preload/index.ts',
        },
        external: ['electron'],
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html',
        },
        output: {
          manualChunks: {
            'three': ['three'],
            'r3f': ['@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
    plugins: [react()],
  },
});
