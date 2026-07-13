const fs = require('fs');
let code = fs.readFileSync('electron/main.cjs', 'utf8');

code = code.replace("show: false", "show: true");
code = code.replace(`  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });`, "");

fs.writeFileSync('electron/main.cjs', code);
