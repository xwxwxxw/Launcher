const fs = require('fs');
let code = fs.readFileSync('src/components/ModsTab.tsx', 'utf8');

code = code.replace(
  "      const data = await res.json();\n      setItems(Array.isArray(data) ? data : []);\n    } catch (e) {",
  `      const data = await res.json();
      const loadedItems = Array.isArray(data) ? data : [];
      setItems(loadedItems);
      
      const missingMeta = loadedItems.filter(i => 
         !i.description || 
         i.description === 'Метаданные отсутствуют.' || 
         i.description === 'Локальный пакет контента.' ||
         i.description === 'Модификация для загрузчика Forge.'
      );
      if (missingMeta.length > 0) {
         fetch('/api/mods/analyze', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ mods: missingMeta })
         }).then(r => r.json()).then(analyzed => {
            if (Array.isArray(analyzed)) {
              setItems(prev => prev.map(p => {
                 const found = analyzed.find(a => a.mod_id === p.mod_id && a.contentType === p.contentType);
                 return found ? { ...p, ...found } : p;
              }));
              onRefresh();
            }
         }).catch(console.error);
      }
    } catch (e) {`
);

fs.writeFileSync('src/components/ModsTab.tsx', code);
