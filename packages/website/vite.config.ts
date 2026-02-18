import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function changelogPlugin() {
  const virtualModuleId = 'virtual:changelog';
  const resolvedId = '\0' + virtualModuleId;

  return {
    name: 'changelog',
    resolveId(id: string) {
      if (id === virtualModuleId) return resolvedId;
    },
    load(id: string) {
      if (id === resolvedId) {
        const content = fs.readFileSync(
          path.resolve(__dirname, '../../CHANGELOG.md'),
          'utf-8'
        );
        return `export default ${JSON.stringify(content)};`;
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), changelogPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000
  }
});
