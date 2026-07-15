const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the useEffect for checking installation to avoid flickering
const oldEffect = `  useEffect(() => {
    const prof = profiles.find(p => p.id === activeProfileId) || profiles[0];
    if (prof) {
      setIsCheckingInstall(true);
      fetch(\`/api/minecraft/check-installed?minecraftPath=\${encodeURIComponent(minecraftPath)}&version=\${prof.game_version}&loader=\${prof.mod_loader}\`)
        .then(res => res.json())
        .then(data => {
          setIsInstalled(data.installed);
          setIsCheckingInstall(false);
        })
        .catch(() => {
          setIsInstalled(false);
          setIsCheckingInstall(false);
        });
    }
  }, [activeProfileId, profiles, minecraftPath]);`;

const newEffect = `  useEffect(() => {
    const prof = profiles.find(p => p.id === activeProfileId) || profiles[0];
    if (prof) {
      setIsCheckingInstall(true);
      fetch(\`/api/minecraft/check-installed?minecraftPath=\${encodeURIComponent(minecraftPath)}&version=\${prof.game_version}&loader=\${prof.mod_loader}\`)
        .then(res => res.json())
        .then(data => {
          setIsInstalled(data.installed);
          setIsCheckingInstall(false);
        })
        .catch(() => {
          setIsInstalled(false);
          setIsCheckingInstall(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, profiles.length, minecraftPath, profiles.find(p => p.id === activeProfileId)?.game_version, profiles.find(p => p.id === activeProfileId)?.mod_loader]);`;

content = content.replace(oldEffect, newEffect);

fs.writeFileSync('src/App.tsx', content);
