const fs = require('fs');
let c = fs.readFileSync('src/components/ModsTab.tsx', 'utf-8');

c = c.replace(/interface ModsTabProps {[\s\S]*?}/, `interface ModsTabProps {
  onRefresh: () => void;
  globalGamePath: string;
}`);

c = c.replace(/export default function ModsTab\(\{ onRefresh, activeProfileId, activeProfile, onOpenModrinth \}: ModsTabProps\) {/, `export default function ModsTab({ onRefresh, globalGamePath }: ModsTabProps) {`);

// Modify fetchItems to use globalGamePath and profileId: 'global'
const oldFetch = `  const fetchItems = async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mods/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfileId, contentType })
      });`;
const newFetch = `  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mods/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: \`\${globalGamePath}/mods\`, profileId: 'global', contentType })
      });`;
c = c.replace(oldFetch, newFetch);

// Modify useEffect
c = c.replace(/  }, \[contentType, activeProfileId\]\);/, `  }, [contentType, globalGamePath]);`);

// Modify handleToggle
const oldToggle = `        body: JSON.stringify({ modId: itemId, profileId: activeProfileId, enabled })`;
const newToggle = `        body: JSON.stringify({ modId: itemId, profileId: 'global', enabled })`;
c = c.replace(oldToggle, newToggle);

// Modify handleDelete
const oldDelete = `        body: JSON.stringify({ modId: itemId, profileId: activeProfileId, filePath })`;
const newDelete = `        body: JSON.stringify({ modId: itemId, profileId: 'global', filePath })`;
c = c.replace(oldDelete, newDelete);

// Modify clientPath
const oldClientPath = `  const clientPath = activeProfile?.mod_path || \`./profiles/\${activeProfileId}/mods\`;`;
const newClientPath = `  const clientPath = \`\${globalGamePath}/mods\`;`;
c = c.replace(oldClientPath, newClientPath);

// Remove the onOpenModrinth button
const modrinthBtn = `            <button \n              onClick={onOpenModrinth}\n              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-emerald-400 transition-all shadow-sm"\n              title="Найти и установить моды онлайн"\n            >\n              <Globe size={14} />\n              <span>Установить моды</span>\n            </button>`;
c = c.replace(modrinthBtn, '');

fs.writeFileSync('src/components/ModsTab.tsx', c);
