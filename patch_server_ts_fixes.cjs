const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("let activeProcess = null;\nconst launcher = new Client();", "const launcher = new Client();");
code = code.replace("const { Client, Authenticator } = mclc;", "const { Client, Authenticator } = mclc;\nlet activeProcess: any = null;");

const targetProfileFallback = `  const activeProfile = profiles.find(p => p.id === profileId) || profiles[0] || {
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric'
  };`;

const replacementProfileFallback = `  const activeProfile = profiles.find(p => p.id === profileId) || profiles[0] || {
    id: profileId ? String(profileId) : '1',
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric',
    mod_path: './profiles/1/.minecraft/mods'
  };`;

code = code.replace(targetProfileFallback, replacementProfileFallback);

fs.writeFileSync('server.ts', code);
