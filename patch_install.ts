import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
    let depends: string[] = [];
    let dependenciesSuggested: any[] = [];
    let downloadUrl = '';
    let fileName = \`\${modId}.jar\`;

    try {
      const versionsRes = await fetch(\`https://api.modrinth.com/v2/project/\${projectId}/version\`);
      if (versionsRes.ok) {
        const versions = await versionsRes.json();
        if (versions.length > 0) {
          const latestVersion = versions[0];
          
          if (latestVersion.files && latestVersion.files.length > 0) {
            downloadUrl = latestVersion.files[0].url;
            fileName = latestVersion.files[0].filename;
          }

          if (latestVersion.dependencies && Array.isArray(latestVersion.dependencies)) {
            const requiredDeps = latestVersion.dependencies.filter((d: any) => d.dependency_type === 'required' && d.project_id);
            for (const dep of requiredDeps) {
              try {
                const depProjectRes = await fetch(\`https://api.modrinth.com/v2/project/\${dep.project_id}\`);
                if (depProjectRes.ok) {
                  const depProj = await depProjectRes.json();
                  depends.push(depProj.slug || depProj.id);
                  dependenciesSuggested.push({
                    projectId: dep.project_id,
                    slug: depProj.slug,
                    title: depProj.title || depProj.name
                  });
                }
              } catch (e) {
                console.error('Error fetching dependency details:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dependencies from Modrinth:', err);
    }

    let targetPath = \`/mock/mods/\${profileId || '1'}/\${modId}.jar\`;
    const profile = profiles.find(p => p.id === profileId);
    let destDir = folderPath;
    if (profile && profile.mod_path) destDir = profile.mod_path;
    
    if (destDir && downloadUrl) {
      const absDir = path.isAbsolute(destDir) ? destDir : path.resolve(process.cwd(), destDir);
      if (!fs.existsSync(absDir)) {
        fs.mkdirSync(absDir, { recursive: true });
      }
      targetPath = path.join(absDir, fileName);
      
      const fileRes = await fetch(downloadUrl);
      if (fileRes.ok && fileRes.body) {
        const arrayBuffer = await fileRes.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
      }
    }

    const mod: any = {
      path: targetPath,`;

content = content.replace(/let depends: string\[\] = \[\];[\s\S]*?path: `\/mock\/mods\/\${profileId \|\| '1'}\/\${modId}\.jar`,/, replacement);
fs.writeFileSync('server.ts', content);
