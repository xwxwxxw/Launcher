const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf-8');

c = c.replace(/`\.\/profiles\/\$\{profileId \|\|\\n\);/g, "`./profiles/${profileId || '1'}`);");

fs.writeFileSync('server.ts', c);
