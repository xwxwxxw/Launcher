const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('import { useCallback')) {
    content = content.replace('import React, { useState, useEffect, useRef }', 'import React, { useState, useEffect, useRef, useCallback }');
}

content = content.replace(
  `  const setRam = (val: number) => {
    setRamState(val);
    localStorage.setItem('launcher_ram', val.toString());
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { ram_mb: val });
    }
  };`,
  `  const setRam = useCallback((val: number) => {
    setRamState(val);
    localStorage.setItem('launcher_ram', val.toString());
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { ram_mb: val });
    }
  }, [activeProfileId]);` // wait, handleUpdateProfile is also re-created?
);

fs.writeFileSync('src/App.tsx', content);
