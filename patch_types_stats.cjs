const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace("minecraft_path?: string;", "minecraft_path?: string;\n  stats?: {\n    totalPlayTimeMs: number;\n    lastLaunchTime: number;\n    launchCount: number;\n  };");

fs.writeFileSync('src/types.ts', code);
