const fs = require('fs');
let code = fs.readFileSync('electron/main.cjs', 'utf8');

const target = `const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray } = require('electron');`;
const rep = `const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');`;

code = code.replace(target, rep);

const targetTray = `    const iconPath = isDev ? path.join(__dirname, '../public/icon.png') : path.join(process.resourcesPath, 'public/icon.png');
    // For now use a native image if possible, or just skip if no icon
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);`;

const repTray = `    const iconPath = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      tray = new Tray(icon);`;

code = code.replace(targetTray, repTray);

fs.writeFileSync('electron/main.cjs', code);
