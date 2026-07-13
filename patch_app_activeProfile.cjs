const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || {
    id: '1',
    name: 'Vanilla 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Vanilla',
    mod_loader_version: '0.15.7',
    description: 'Чистая сборка без модов.',
    ram_mb: ram
  };`;

const rep = `  const activeProfile: any = profiles.find(p => p.id === activeProfileId) || profiles[0] || {
    id: '1',
    name: 'Vanilla 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Vanilla',
    mod_loader_version: '0.15.7',
    description: 'Чистая сборка без модов.',
    ram_mb: ram,
    mod_path: './profiles/1/.minecraft/mods',
    created_at: Date.now(),
    is_active: true
  };`;

code = code.replace(target, rep);
fs.writeFileSync('src/App.tsx', code);
