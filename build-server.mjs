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
  outfile: 'dist/server.cjs'
}).catch(() => process.exit(1));
