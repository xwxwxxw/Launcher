const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("import archiver from 'archiver';", "import archiver from 'archiver';"); 
// wait, we can just replace all with createRequire

const requireImports = `import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
const unzipper = require('unzipper');
`;

code = code.replace("import archiver from 'archiver';\nimport unzipper from 'unzipper';", requireImports);

fs.writeFileSync('server.ts', code);
