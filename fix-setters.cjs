const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  `  const setJavaPath = (val: string) => {
    setJavaPathState(val);
    localStorage.setItem('launcher_java_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { java_path: val });
    }
  };`,
  `  const setJavaPath = useCallback((val: string) => {
    setJavaPathState(val);
    localStorage.setItem('launcher_java_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { java_path: val });
    }
  }, [activeProfileId]);`
);

content = content.replace(
  `  const setMinecraftPath = (val: string) => {
    setMinecraftPathState(val);
    localStorage.setItem('launcher_minecraft_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { minecraft_path: val });
    }
  };`,
  `  const setMinecraftPath = useCallback((val: string) => {
    setMinecraftPathState(val);
    localStorage.setItem('launcher_minecraft_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { minecraft_path: val });
    }
  }, [activeProfileId]);`
);

fs.writeFileSync('src/App.tsx', content);
