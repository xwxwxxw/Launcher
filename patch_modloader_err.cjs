const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("mod_loader: 'Fabric',", "mod_loader: 'Fabric' as const,");

fs.writeFileSync('server.ts', code);
