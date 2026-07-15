const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsTab.tsx', 'utf-8');

content = content.replace(
  `  useEffect(() => {
    if (isAutoRam && systemRamSpecs && systemRamSpecs.suggested) {
      setRam(systemRamSpecs.suggested);
    }
  }, [isAutoRam, systemRamSpecs, setRam]);`,
  `  useEffect(() => {
    if (isAutoRam && systemRamSpecs && systemRamSpecs.suggested) {
      setRam(systemRamSpecs.suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoRam, systemRamSpecs]);`
);

fs.writeFileSync('src/components/SettingsTab.tsx', content);
