const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
`    const projectType = project.project_type || 'mod';
    const contentType = projectType === 'resourcepack' 
      ? 'resourcepacks' 
      : (projectType === 'shader' ? 'shaderpacks' : 'mods');

    let targetPath = \`/mock/\${contentType}/\${profileId || '1'}/\${modId}\${projectType === 'mod' ? '.jar' : '.zip'}\`;

    const profile = profiles.find(p => p.id === profileId);
    let destDir = folderPath;
    if (profile && profile.mod_path) destDir = profile.mod_path;
    
    if (destDir) {
      const destFolder = contentType === 'resourcepacks' 
        ? 'resourcepacks' 
        : (contentType === 'shaderpacks' ? 'shaderpacks' : 'mods');
      destDir = destDir.replace(/mods\\/?$/, destFolder);
    }`,
`    const projectType = project.project_type || 'mod';
    const computedContentType = projectType === 'resourcepack' 
      ? 'resourcepacks' 
      : (projectType === 'shader' ? 'shaderpacks' : 'mods');

    let targetPath = \`/mock/\${computedContentType}/\${profileId || '1'}/\${modId}\${projectType === 'mod' ? '.jar' : '.zip'}\`;

    const profile = profiles.find(p => p.id === profileId);
    let destDir = folderPath;
    if (profile && profile.mod_path) destDir = profile.mod_path;
    
    if (destDir) {
      const installTarget = req.body.installTarget || 'client';
      const destFolder = computedContentType === 'resourcepacks' 
        ? 'resourcepacks' 
        : (computedContentType === 'shaderpacks' ? 'shaderpacks' : (installTarget === 'server' ? 'server-mods' : 'mods'));
      destDir = destDir.replace(/mods\\/?$/, destFolder);
    }`
);
fs.writeFileSync('server.ts', content);
