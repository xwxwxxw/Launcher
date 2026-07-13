const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  let opts: any = {
    clientPackage: null,
    authorization: authData,
    root: minecraftPathAbsolute,`;

const rep = `  // Always use global root for assets and libraries to prevent redownloading
  const globalRoot = path.resolve(process.cwd(), './.minecraft');
  const isolatedDir = path.resolve(process.cwd(), \`./profiles/\${activeProfile.id}/.minecraft\`);
  
  if (!fs.existsSync(isolatedDir)) {
    fs.mkdirSync(isolatedDir, { recursive: true });
  }

  let opts: any = {
    clientPackage: null,
    authorization: authData,
    root: globalRoot,
    overrides: {
      gameDirectory: isolatedDir,
    },`;

code = code.replace(target, rep);

fs.writeFileSync('server.ts', code);
