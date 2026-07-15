const fs = require('fs');

let content = fs.readFileSync('electron/main.cjs', 'utf-8');

const handler = `ipcMain.handle('install-update', async (event, tempPath) => {
  try {
    const targetPath = process.execPath;
    const batPath = require('path').join(app.getPath('temp'), 'updater.bat');
    
    // As per user request: Installer shouldn't check if launcher is running.
    // It should: download new files -> replace launcher files -> start updated launcher -> close itself.
    // We will use ping or timeout to give launcher time to close, then force replace.
    const script = \\\`@echo off
chcp 65001 > NUL
echo Updating...
timeout /t 2 /nobreak > NUL
:retry
if exist "\\\${targetPath}.old" del "\\\${targetPath}.old"
ren "\\\${targetPath}" "\\\${require('path').basename(targetPath)}.old"
if errorlevel 1 (
    timeout /t 1 /nobreak > NUL
    goto retry
)
copy /y "\\\${tempPath}" "\\\${targetPath}"
start "" "\\\${targetPath}"
del "%~f0"
\\\`;
    
    fs.writeFileSync(batPath, script);
    
    require('child_process').spawn('cmd.exe', ['/c', batPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();
    
    app.isQuiting = true;
    app.quit();
    return { success: true };
  } catch (e) {
    console.error('Update install failed:', e);
    return { success: false, error: e.message };
  }
});
`;

content = content.replace(/ipcMain\.handle\('install-update'[\s\S]*?\}\)\.unref\(\);\n\n/g, handler);

// Alternatively, let's just use string replace before `function getFreePort()`
content = content.replace(/ipcMain\.handle\('install-update'[\s\S]*?function getFreePort/, handler + '\nfunction getFreePort');

fs.writeFileSync('electron/main.cjs', content);
