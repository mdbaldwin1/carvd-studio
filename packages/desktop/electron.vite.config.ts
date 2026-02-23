import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom plugin to copy splash.html to output
const copySplashPlugin = () => ({
  name: 'copy-splash',
  closeBundle() {
    try {
      mkdirSync(resolve(__dirname, 'out/main'), { recursive: true });
      copyFileSync(resolve(__dirname, 'src/main/splash.html'), resolve(__dirname, 'out/main/splash.html'));
      mkdirSync(resolve(__dirname, 'out/main/branding'), { recursive: true });
      copyFileSync(
        resolve(__dirname, '../../assets/Carvd-Icon.svg'),
        resolve(__dirname, 'out/main/branding/Carvd-Icon.svg')
      );
      copyFileSync(
        resolve(__dirname, '../../assets/Carvd-Icon-WHT.svg'),
        resolve(__dirname, 'out/main/branding/Carvd-Icon-WHT.svg')
      );
      copyFileSync(
        resolve(__dirname, '../../assets/CarvdStudio-Vertical.svg'),
        resolve(__dirname, 'out/main/branding/CarvdStudio-Vertical.svg')
      );
      copyFileSync(
        resolve(__dirname, '../../assets/CarvdStudio-Vertical-WHT.svg'),
        resolve(__dirname, 'out/main/branding/CarvdStudio-Vertical-WHT.svg')
      );
    } catch (e) {
      console.warn('Could not copy splash assets:', e);
    }
  }
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySplashPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/main/index.ts'
        },
        external: ['electron']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/preload/index.ts'
        },
        external: ['electron']
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        // Stub out unused jsPDF optional dependencies (saves ~386 KB)
        // jsPDF only needs these for its .html() method, which we never call —
        // pdfExport.ts draws everything programmatically with .text()/.line()/.rect()
        html2canvas: resolve(__dirname, 'src/renderer/src/stubs/empty-module.ts'),
        dompurify: resolve(__dirname, 'src/renderer/src/stubs/empty-module.ts')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html'
        },
        output: {
          manualChunks: {
            three: ['three'],
            r3f: ['@react-three/fiber', '@react-three/drei']
          }
        }
      }
    },
    plugins: [
      tailwindcss(),
      react(),
      ...(process.env.ANALYZE === 'true'
        ? [visualizer({ filename: 'bundle-analysis.html', open: true, gzipSize: true })]
        : [])
    ]
  }
});
