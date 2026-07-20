const fs = require('fs');
let code = fs.readFileSync('src/lib/modParser.ts', 'utf8');

code = code.replace(
  "export async function fetchModrinthData(mod: ModInfo): Promise<void> {",
  `export async function fetchModrinthData(mod: ModInfo): Promise<void> {
  let project_type = 'mod';
  if ((mod as any).contentType === 'resourcepacks') project_type = 'resourcepack';
  if ((mod as any).contentType === 'shaderpacks') project_type = 'shader';
`
);

code = code.replace(
  "const searchRes = await fetch(`https://api.modrinth.com/v2/search?query=${query}&limit=1&facets=[[\"project_type:mod\"]]`);",
  "const searchRes = await fetch(`https://api.modrinth.com/v2/search?query=${query}&limit=1&facets=[[\"project_type:${project_type}\"]]`);"
);

fs.writeFileSync('src/lib/modParser.ts', code);
