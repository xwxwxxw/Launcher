const fs = require('fs');
let code = fs.readFileSync('electron/main.cjs', 'utf8');

const targetMainWin = `  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });`;

const replacementMainWin = `  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting && global.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });`;

if (!code.includes("app.isQuiting")) {
  code = code.replace("app.on('window-all-closed', () => {", "app.on('before-quit', () => { app.isQuiting = true; });\napp.on('window-all-closed', () => {");
}

if (!code.includes("global.minimizeToTray")) {
  code = code.replace("let mainWindow = null;", "let mainWindow = null;\nglobal.minimizeToTray = false;");
}

if (!code.includes("set-autostart")) {
  const ipcTarget = `// 3. GitHub Updates`;
  const ipcReplacement = `ipcMain.handle('set-autostart', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath
  });
});

ipcMain.handle('set-minimize-to-tray', (event, enable) => {
  global.minimizeToTray = enable;
});

// 3. GitHub Updates`;
  code = code.replace(ipcTarget, ipcReplacement);
}

if (code.includes(`  mainWindow.webContents.on('did-finish-load'`)) {
   const mainCloseHackTarget = `  mainWindow.webContents.on('did-finish-load'`;
   const mainCloseHackRep = `  mainWindow.on('close', (event) => {
    if (!app.isQuiting && global.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-finish-load'`;
   if (!code.includes(`mainWindow.on('close', (event) => {`)) {
       code = code.replace(mainCloseHackTarget, mainCloseHackRep);
   }
}

fs.writeFileSync('electron/main.cjs', code);
