const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `      if (!p.mod_path || p.mod_path.trim() === '') {
        p.mod_path = \`./profiles/\${p.id}/mods\`;
        migrated = true;
      }`;

const rep1 = `      if (!p.mod_path || p.mod_path.trim() === '') {
        p.mod_path = \`./profiles/\${p.id}/.minecraft/mods\`;
        migrated = true;
      }`;

code = code.replace(target1, rep1);

code = code.replace(
  "mod_path: './profiles/1/mods',",
  "mod_path: './profiles/1/.minecraft/mods',"
);

code = code.replace(
  "mod_path: './profiles/2/mods',",
  "mod_path: './profiles/2/.minecraft/mods',"
);

const target2 = `    if (!updated.mod_path || updated.mod_path.trim() === '') {
      updated.mod_path = \`./profiles/\${req.params.id}/mods\`;
    }`;

const rep2 = `    if (!updated.mod_path || updated.mod_path.trim() === '') {
      updated.mod_path = \`./profiles/\${req.params.id}/.minecraft/mods\`;
    }`;

code = code.replace(target2, rep2);

const target3 = `  const selectedMinecraft = minecraftPath ? String(minecraftPath) : './.minecraft';
  const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);`;

const rep3 = `  const baseDir = getStorageDir(); // Or process.cwd() ? Wait! It should probably go in the APPDATA folder now!
  const selectedMinecraft = minecraftPath ? String(minecraftPath) : \`./profiles/\${activeProfile.id}/.minecraft\`;
  const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);`;

code = code.replace(target3, rep3);

fs.writeFileSync('server.ts', code);
