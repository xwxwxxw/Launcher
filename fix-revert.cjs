const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf-8');

c = c.replace(/`\.\/profiles\/\$\{profileId \|\| '1'\}\`/g, '\\n');

// Also fix `profileId ||`./profiles/${profileId || '1'}`
c = c.replace(/profileId \|\|`\.\/profiles\/\$\{profileId \|\| '1'\}\`/g, "profileId || '1'");

fs.writeFileSync('server.ts', c);
