const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf-8');
c = c.replace(/res\.write\(\`event: \$\{type\}\`\.\/profiles\/\$\{profileId \|\| '1'\}\`ndata: \$\{JSON\.stringify\(data\)\}\`\.\/profiles\/\$\{profileId \|\| '1'\}\`n\`\.\/profiles\/\$\{profileId \|\| '1'\}\`n\`\);/, 
  'res.write(`event: ${type}\\ndata: ${JSON.stringify(data)}\\n\\n`);');
fs.writeFileSync('server.ts', c);
