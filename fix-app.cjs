const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');

const oldModsTab = `<ModsTab \n              onRefresh={fetchMods}\n              activeProfileId={activeProfileId}\n              activeProfile={activeProfile}\n              onOpenModrinth={() => setShowModrinthModal(true)}\n            />`;

const newModsTab = `<ModsTab \n              onRefresh={fetchMods}\n              globalGamePath={globalGamePath}\n            />`;

c = c.replace(oldModsTab, newModsTab);

fs.writeFileSync('src/App.tsx', c);
