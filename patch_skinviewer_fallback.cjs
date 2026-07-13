const fs = require('fs');
let code = fs.readFileSync('src/components/SkinViewer.tsx', 'utf8');

code = code.replace(
  'skin: `https://skins.ely.by/skins/${username}.png`',
  'skin: `https://skins.ely.by/skins/${username || "Steve"}.png`'
);

fs.writeFileSync('src/components/SkinViewer.tsx', code);
