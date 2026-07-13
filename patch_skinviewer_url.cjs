const fs = require('fs');
let code = fs.readFileSync('src/components/SkinViewer.tsx', 'utf8');

code = code.replace(/http:\/\/skins.ely.by/g, 'https://skins.ely.by');

fs.writeFileSync('src/components/SkinViewer.tsx', code);
