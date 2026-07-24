import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function parseGitHubRepo(repoString: string): string {
  if (!repoString) return '';
  let clean = repoString.trim().replace(/\.git$/, '');
  if (clean.includes('github.com/')) {
    const parts = clean.split('github.com/');
    if (parts.length > 1) {
      return parts[1];
    }
  }
  if (clean.includes('github.com:')) {
    const parts = clean.split('github.com:');
    if (parts.length > 1) {
      return parts[1];
    }
  }
  return clean;
}

export default defineConfig(({ mode }) => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  const version = pkg.version || '0.0.11';
  const rawRepo = process.env.GITHUB_REPO || '';
  const parsedRepo = parseGitHubRepo(rawRepo);

  return {
    plugins: [react(), tailwindcss()],
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('skinview3d') || id.includes('three')) {
                return 'vendor-skinviewer';
              }
              if (id.includes('d3')) {
                return 'vendor-d3';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-markdown')) {
                return 'vendor-markdown';
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_GITHUB_REPO': JSON.stringify(parsedRepo),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      'import.meta.env.VITE_GDRIVE_API_KEY': JSON.stringify(process.env.GDRIVE_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: { clientPort: 443 },
      allowedHosts: true as true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: {},
    },
  };
});
