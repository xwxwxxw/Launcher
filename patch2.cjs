const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
let newLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes("const contentType = projectType === 'resourcepack'")) {
    newLines.push("    const computedContentType = projectType === 'resourcepack' ");
    newLines.push("      ? 'resourcepacks' ");
    newLines.push("      : (projectType === 'shader' ? 'shaderpacks' : 'mods');");
    newLines.push("");
    newLines.push("    let targetPath = `/mock/${computedContentType}/${profileId || '1'}/${modId}${projectType === 'mod' ? '.jar' : '.zip'}`;");
    i += 6;
  } else if (lines[i].includes("const destFolder = contentType === 'resourcepacks'")) {
    newLines.push("      const installTarget = req.body.installTarget || 'client';");
    newLines.push("      const destFolder = computedContentType === 'resourcepacks' ");
    newLines.push("        ? 'resourcepacks' ");
    newLines.push("        : (computedContentType === 'shaderpacks' ? 'shaderpacks' : (installTarget === 'server' ? 'server-mods' : 'mods'));");
    i += 3;
  } else {
    newLines.push(lines[i]);
    i++;
  }
}
fs.writeFileSync('server.ts', newLines.join('\n'));
