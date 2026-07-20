const fs = require('fs');
let code = fs.readFileSync('src/lib/modParser.ts', 'utf8');

code = code.replace(
  "const query = encodeURIComponent(mod.display_name);",
  `  // Clean up the query for better Modrinth matching
  let cleanQuery = mod.display_name
    .replace(/\\.(jar|zip)$/i, '')
    .replace(/[-_+]/g, ' ')
    .replace(/\\b(fabric|forge|quilt|mc|minecraft)\\b/gi, '')
    .replace(/\\b(1\\.\\d+(\\.\\d+)?)\\b/g, '') // remove versions like 1.20.1
    .replace(/\\b(v?\\d+\\.\\d+(\\.\\d+)?)\\b/gi, '') // remove generic versions
    .replace(/\\s+/g, ' ')
    .trim();
  
  if (!cleanQuery) cleanQuery = mod.display_name.replace(/[-_+]/g, ' ').trim();
  const query = encodeURIComponent(cleanQuery);`
);

fs.writeFileSync('src/lib/modParser.ts', code);
