// electron.vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
var __electron_vite_injected_dirname = "/Users/mbaldwin/Carvd/carvd-studio/packages/desktop";
var copySplashPlugin = () => ({
  name: "copy-splash",
  closeBundle() {
    try {
      mkdirSync(resolve(__electron_vite_injected_dirname, "out/main"), { recursive: true });
      copyFileSync(resolve(__electron_vite_injected_dirname, "src/main/splash.html"), resolve(__electron_vite_injected_dirname, "out/main/splash.html"));
      mkdirSync(resolve(__electron_vite_injected_dirname, "out/main/branding"), { recursive: true });
      copyFileSync(
        resolve(__electron_vite_injected_dirname, "../../assets/Carvd-Icon.svg"),
        resolve(__electron_vite_injected_dirname, "out/main/branding/Carvd-Icon.svg")
      );
      copyFileSync(
        resolve(__electron_vite_injected_dirname, "../../assets/Carvd-Icon-WHT.svg"),
        resolve(__electron_vite_injected_dirname, "out/main/branding/Carvd-Icon-WHT.svg")
      );
      copyFileSync(
        resolve(__electron_vite_injected_dirname, "../../assets/CarvdStudio-Vertical.svg"),
        resolve(__electron_vite_injected_dirname, "out/main/branding/CarvdStudio-Vertical.svg")
      );
      copyFileSync(
        resolve(__electron_vite_injected_dirname, "../../assets/CarvdStudio-Vertical-WHT.svg"),
        resolve(__electron_vite_injected_dirname, "out/main/branding/CarvdStudio-Vertical-WHT.svg")
      );
    } catch (e) {
      console.warn("Could not copy splash assets:", e);
    }
  }
});
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySplashPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: "src/main/index.ts"
        },
        external: ["electron"]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: "src/preload/index.ts"
        },
        external: ["electron"]
      }
    }
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: {
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer/src"),
        // Stub out unused jsPDF optional dependencies (saves ~386 KB)
        // jsPDF only needs these for its .html() method, which we never call —
        // pdfExport.ts draws everything programmatically with .text()/.line()/.rect()
        html2canvas: resolve(__electron_vite_injected_dirname, "src/renderer/src/stubs/empty-module.ts"),
        dompurify: resolve(__electron_vite_injected_dirname, "src/renderer/src/stubs/empty-module.ts")
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: "src/renderer/index.html"
        },
        output: {
          manualChunks: {
            three: ["three"],
            r3f: ["@react-three/fiber", "@react-three/drei"]
          }
        }
      }
    },
    plugins: [
      tailwindcss(),
      react(),
      ...process.env.ANALYZE === "true" ? [visualizer({ filename: "bundle-analysis.html", open: true, gzipSize: true })] : []
    ]
  }
});
export {
  electron_vite_config_default as default
};
