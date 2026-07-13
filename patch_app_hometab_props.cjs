const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("activeProfileName={activeProfile.name}", "activeProfileName={activeProfile.name}\n              activeProfile={activeProfile}");

fs.writeFileSync('src/App.tsx', code);
