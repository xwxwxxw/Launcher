const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// remove Modrinth button
content = content.replace(
`          <TabButton 
            active={activeTab === 'modrinth'} 
            onClick={() => setActiveTab('modrinth')} 
            icon={<DownloadCloud size={22} strokeWidth={activeTab === 'modrinth' ? 2.5 : 2} />} 
            label="Сборщик" 
          />`,
``
);

// remove Modrinth rendering
content = content.replace(
`          {activeTab === 'modrinth' && (
            <ModrinthTab 
              onRefresh={fetchMods}
              activeProfileId={activeProfileId}
              activeProfile={activeProfile}
            />
          )}`,
``
);

// remove ModrinthTab import
content = content.replace(`import ModrinthTab from './components/ModrinthTab';`, ``);

// remove 'modrinth' from union types
content = content.replace(`| 'modrinth'`, ``);
content = content.replace(`| 'modrinth'`, ``);

fs.writeFileSync('src/App.tsx', content);
