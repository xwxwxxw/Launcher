const fs = require('fs');
let content = fs.readFileSync('src/components/ModsTab.tsx', 'utf8');

// replace viewMode state
content = content.replace("const [viewMode, setViewMode] = useState<'client' | 'server' | 'both'>('client');", "");

// replace environment filter
content = content.replace(
`    // Environment filter only applicable to mods
    if (contentType === 'mods') {
      if (viewMode === 'client' && m.environment === 'server') return false;
      if (viewMode === 'server' && m.environment === 'client') return false;
    }`,
`    // No environment filter anymore`
);

// replace view mode buttons
content = content.replace(
`          {contentType === 'mods' ? (
            <div className="flex bg-zinc-900/50 rounded-xl border border-zinc-800/60 p-1.5 shadow-inner">
              <ViewBtn active={viewMode === 'client'} onClick={() => setViewMode('client')} label="Клиент" />
              <ViewBtn active={viewMode === 'server'} onClick={() => setViewMode('server')} label="Сервер" />
              <ViewBtn active={viewMode === 'both'} onClick={() => setViewMode('both')} label="Объединённый" />
            </div>
          ) : (
            <div />
          )}`,
`          <div />`
);

fs.writeFileSync('src/components/ModsTab.tsx', content);
