const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStr = `function normalizeProfilePath(inputPath: string, profileId: string, customMcPath?: string): string {
  if (!inputPath) return '';
  if (inputPath.startsWith('./profiles') || inputPath.includes('/profiles/')) {
    const mcPath = customMcPath && customMcPath.trim() !== '' ? customMcPath : './.minecraft';
    const resolvedMcPath = path.isAbsolute(mcPath) ? mcPath : path.resolve(process.cwd(), mcPath);
    
    // Extract subfolders after "./profiles/${"profileId"}/"
    const regex = new RegExp(\`\\\\.?\\\\/?profiles\\\\/\${profileId}\\\\/?(.*)\`);
    const match = inputPath.match(regex);
    const sub = match && match[1] ? match[1] : '';
    return path.join(resolvedMcPath, 'profiles', profileId, sub);
  }
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}`;

const newStr = `function normalizeProfilePath(inputPath: string, profileId: string, customMcPath?: string): string {
  if (!inputPath) return '';
  if (inputPath.startsWith('./profiles') || inputPath.includes('/profiles/')) {
    const mcPath = customMcPath && customMcPath.trim() !== '' ? customMcPath : DATA_DIR;
    const resolvedMcPath = path.isAbsolute(mcPath) ? mcPath : path.resolve(DATA_DIR, mcPath);
    
    // Extract subfolders after "./profiles/\${profileId}/"
    const regex = new RegExp(\`\\\\.?\\\\/?profiles\\\\/\${profileId}\\\\/?(.*)\`);
    const match = inputPath.match(regex);
    const sub = match && match[1] ? match[1] : '';
    return path.join(resolvedMcPath, 'profiles', profileId, sub);
  }
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(DATA_DIR, inputPath);
}`;

code = code.replace(oldStr, newStr);

// Also patch line 1416: const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);
code = code.replace(
  'const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);',
  'const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(DATA_DIR, selectedMinecraft);'
);

fs.writeFileSync('server.ts', code);
