const fs = require('fs');
let code = fs.readFileSync('electron/main.cjs', 'utf-8');

code = code.replace(
  "    process.chdir(path.join(__dirname, '..'));\n    // Start the express server\n    require(path.join(__dirname, '../dist/server.cjs'));",
  "    process.chdir(app.getPath('userData'));\n    // Start the express server\n    try {\n      require(path.join(__dirname, '../dist/server.cjs'));\n    } catch(err) {\n      console.error('Server start failed:', err);\n      dialog.showErrorBox('Server Error', String(err));\n    }"
);

fs.writeFileSync('electron/main.cjs', code);
