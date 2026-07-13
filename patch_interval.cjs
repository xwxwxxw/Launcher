const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("const interval = setInterval(checkGameStatus, 3000);", "const gameStatusInterval = setInterval(checkGameStatus, 3000);");
code = code.replace("clearInterval(interval);", "clearInterval(gameStatusInterval);");

fs.writeFileSync('src/App.tsx', code);
