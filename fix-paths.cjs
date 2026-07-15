const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// Replace /.minecraft/mods with /mods
content = content.replace(/\/\.minecraft\/mods/g, '/mods');

// Replace .minecraft to root in game logic
content = content.replace(/path\.join\(profileDir, '\.minecraft', 'mods'\)/g, "path.join(profileDir, 'mods')");

// Replace selectedMinecraft fallback
content = content.replace(/`\.\/profiles\/\$\{activeProfile\.id\}\/\.minecraft`/g, "`./profiles/${activeProfile.id}`");

// Replace logs/screenshots/open folder
content = content.replace(/`\.\/profiles\/\$\{profileId \\|\\| '1'\}\/\.minecraft`/g, "`./profiles/${profileId || '1'}`");

fs.writeFileSync('server.ts', content);
