import * as esbuild from 'esbuild';
import dotenv from 'dotenv';
dotenv.config();

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  outfile: 'dist/server.cjs',
  define: {
    'process.env.GDRIVE_API_KEY': JSON.stringify(process.env.GDRIVE_API_KEY || ''),
    'process.env.GDRIVE_FOLDER_ID': JSON.stringify(process.env.GDRIVE_FOLDER_ID || ''),
    'process.env.ELY_CLIENT_ID': JSON.stringify(process.env.ELY_CLIENT_ID || ''),
    'process.env.ELY_CLIENT_SECRET': JSON.stringify(process.env.ELY_CLIENT_SECRET || ''),
    'process.env.GITHUB_REPO': JSON.stringify(process.env.GITHUB_REPO || ''),
    'process.env.VITE_GITHUB_REPO': JSON.stringify(process.env.GITHUB_REPO || '')
  }
}).catch(() => process.exit(1));
