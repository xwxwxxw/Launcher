const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace("export interface ModInfo {", "export interface ModInfo {\n  profile_id?: string;");

fs.writeFileSync('src/types.ts', code);
