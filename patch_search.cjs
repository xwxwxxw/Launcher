const fs = require('fs');
let code = fs.readFileSync('src/components/ModsTab.tsx', 'utf8');

code = code.replace(
  "      if (search && !m.display_name.toLowerCase().includes(search.toLowerCase()) && !m.mod_id.toLowerCase().includes(search.toLowerCase())) return false;",
  `      if (search) {
        const q = search.toLowerCase();
        const textToSearch = [
          m.display_name,
          m.mod_id,
          m.name,
          m.description,
          m.description_ru,
          m.categories?.join(' '),
          m.categories_ru?.join(' ')
        ].filter(Boolean).join(' ').toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }`
);

fs.writeFileSync('src/components/ModsTab.tsx', code);
