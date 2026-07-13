const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
const unzipper = require('unzipper');`;

const replacement = `import archiverPkg from 'archiver';
import unzipperPkg from 'unzipper';
const archiver: any = archiverPkg && (archiverPkg as any).default ? (archiverPkg as any).default : archiverPkg;
const unzipper: any = unzipperPkg && (unzipperPkg as any).default ? (unzipperPkg as any).default : unzipperPkg;`;

code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
