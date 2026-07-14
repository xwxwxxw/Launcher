const fs = require('fs');
let content = fs.readFileSync('src/components/ModsTab.tsx', 'utf8');

// remove view modes
content = content.replace(/<div className="flex bg-zinc-900\/50 rounded-xl border border-zinc-800\/60 p-1.5 shadow-inner">.*?<\/div>/s, '<div />');
content = content.replace("const [viewMode, setViewMode] = useState<'client' | 'server' | 'both'>('client');", "");
content = content.replace("const filteredItems = items.filter(m => {", "const filteredItems = items.filter(m => {");
content = content.replace(/if \(contentType === 'mods'\) \{[\s\S]*?if \(viewMode === 'client' && !m\.is_client\) return false;[\s\S]*?if \(viewMode === 'server' && !m\.is_server\) return false;[\s\S]*?\}/g, "if (contentType === 'mods') {}");

fs.writeFileSync('src/components/ModsTab.tsx', content);
