const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const os = require('os');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// 6. Single instance
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
global.minimizeToTray = false;
let tray = null;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// 4. Убрать File Edit
Menu.setApplicationMenu(null);

// 1. Session saving
const authPath = path.join(app.getPath('userData'), 'auth.json');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

try {
  if (fs.existsSync(settingsPath)) {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (s.launcher_minimize_tray === '1' || s.launcher_minimize_tray === true) {
      global.minimizeToTray = true;
    }
  }
} catch (e) {}

ipcMain.handle('save-auth', (event, authData) => {
  fs.writeFileSync(authPath, JSON.stringify(authData));
});

ipcMain.handle('get-auth', () => {
  if (fs.existsSync(authPath)) {
    try {
      return JSON.parse(fs.readFileSync(authPath, 'utf8'));
    } catch(e) {}
  }
  return null;
});

ipcMain.handle('save-settings', (event, newSettings) => {
  try {
    let current = {};
    if (fs.existsSync(settingsPath)) {
      current = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
});

ipcMain.handle('get-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {};
});

ipcMain.handle('delete-setting', (event, key) => {
  try {
    if (fs.existsSync(settingsPath)) {
      const current = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (key in current) {
        delete current[key];
        fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2));
      }
    }
    return true;
  } catch (e) {
    console.error('Failed to delete setting:', e);
    return false;
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('select-directory', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: defaultPath || undefined
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-path', async (event, dirPath) => {
  if (dirPath) {
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(absolutePath)) {
      try {
        fs.mkdirSync(absolutePath, { recursive: true });
      } catch (err) {
        console.error('Failed to create directory to open:', err);
      }
    }
    await shell.openPath(absolutePath);
    return true;
  }
  return false;
});

ipcMain.handle('set-autostart', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath
  });
});

ipcMain.handle('set-minimize-to-tray', (event, enable) => {
  global.minimizeToTray = enable;
});

// Window controls IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    if (!app.isQuiting && global.minimizeToTray) {
      mainWindow.hide();
    } else {
      mainWindow.close();
    }
  }
});

// 3. GitHub Updates
ipcMain.handle('check-updates', async (event, repo) => {
  return new Promise((resolve) => {
    if (!repo) return resolve({ error: 'No repo provided' });
    
    const req = https.get(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'Minecraft-Launcher' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            if (res.statusCode === 404) {
              return resolve({ error: 'Релизы в репозитории не найдены или репозиторий приватный/не существует (404)' });
            }
            return resolve({ error: `GitHub API status ${res.statusCode}` });
          }
          const release = JSON.parse(data);
          const versionMatch = release.tag_name.match(/(\d+\.\d+\.\d+)/);
          const latestVersion = versionMatch ? versionMatch[1] : release.tag_name.replace(/^v/, '');
          const currentVersion = app.getVersion();
          
          if (latestVersion !== currentVersion) {
            resolve({ 
              updateAvailable: true, 
              latestVersion, 
              releaseNotes: release.body,
              assets: release.assets 
            });
          } else {
            resolve({ updateAvailable: false });
          }
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
  });
});

ipcMain.handle('download-update', async (event, assetUrl, sha256AssetUrl) => {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), `launcher-update-${Date.now()}.exe`);
    
    const downloadFile = (url, dest) => {
      return new Promise((res, rej) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { headers: { 'User-Agent': 'Minecraft-Launcher' } }, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            https.get(response.headers.location, { headers: { 'User-Agent': 'Minecraft-Launcher' } }, (redirectRes) => {
              redirectRes.pipe(file);
              file.on('finish', () => file.close(res));
            }).on('error', rej);
          } else {
            response.pipe(file);
            file.on('finish', () => file.close(res));
          }
        }).on('error', rej);
      });
    };

    const downloadText = (url) => {
      return new Promise((res, rej) => {
        https.get(url, { headers: { 'User-Agent': 'Minecraft-Launcher' } }, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            https.get(response.headers.location, { headers: { 'User-Agent': 'Minecraft-Launcher' } }, (redirectRes) => {
              let d = '';
              redirectRes.on('data', c => d+=c);
              redirectRes.on('end', () => res(d));
            }).on('error', rej);
          } else {
            let d = '';
            response.on('data', c => d+=c);
            response.on('end', () => res(d));
          }
        }).on('error', rej);
      });
    };

    downloadFile(assetUrl, tempPath).then(async () => {
      if (sha256AssetUrl) {
        try {
          const shaText = await downloadText(sha256AssetUrl);
          const expectedSha = shaText.split(' ')[0].trim().toLowerCase();
          
          const hash = crypto.createHash('sha256');
          const fileBuffer = fs.readFileSync(tempPath);
          hash.update(fileBuffer);
          const actualSha = hash.digest('hex').toLowerCase();
          
          if (expectedSha && actualSha !== expectedSha) {
             fs.unlinkSync(tempPath);
             return resolve({ success: false, error: 'SHA256 mismatch' });
          }
        } catch (e) {
          console.error('SHA verification failed:', e);
        }
      }
      
      resolve({ success: true, tempPath });
    }).catch(e => {
      resolve({ success: false, error: e.message });
    });
  });
});

ipcMain.handle('install-update', async (event, tempPath) => {
  try {
    const targetPath = process.execPath;
    // We can't rename process.execPath while it's running directly if it's locked.
    // Usually on Windows, we can rename the running .exe and copy the new one over.
    if (process.platform === 'win32') {
      const oldPath = targetPath + '.old';
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      fs.renameSync(targetPath, oldPath);
      fs.copyFileSync(tempPath, targetPath);
    } else {
      fs.copyFileSync(tempPath, targetPath);
    }
    app.relaunch();
    app.quit();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer(function(sock) {
      sock.end('Hello world\n');
    });
    srv.listen(0, function() {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#09090b',
    show: true
  });



  mainWindow.on('close', (event) => {
    if (!app.isQuiting && global.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Send auth back on load
    if (fs.existsSync(authPath)) {
      try {
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        mainWindow.webContents.send('session-restore', authData);
      } catch (e) {}
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    process.env.NODE_ENV = 'production';
    try {
      const freePort = await getFreePort();
      process.env.PORT = String(freePort);
      process.chdir(app.getPath('userData'));
      require(path.join(__dirname, '../dist/server.cjs'));
      setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${freePort}`);
      }, 1000);
    } catch (err) {
      console.error('Server start failed:', err);
      dialog.showErrorBox('Server Error', String(err));
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // 5. Tray
  try {
    const trayIconPath = path.join(app.getPath('userData'), 'tray_icon.png');
    if (!fs.existsSync(trayIconPath)) {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAByklEQVQ4T4XSy0uUURgH8N/zvt+Z8b0oXgYvSAsrtI2gFi3atCgIolUrtGvTIn9ArVq1S9vYorZpEwiitIigFrXpYREtYmSpID7G0Yxzfud9T8zSgXN6F+fAOfCc57OfIitUunL8W9X4bV9S012b1P1oInbve31n6VzN+gX6r2C7tqHl0fDoxSOf7R+9fXf7p7DizQ62V3vWstH99E06vH1y319+X9z7+atgG5st3Kx8dZ9E8N0M78/q06XOfmCjWsuWyR8O+pMvXp3VByvdfX+jSks2gRshEThPAnpAnuFv8H6V3y7pgyf7CPhhT+GHeSg48yWCHs4H9AitD5GgU+6gK9fI5S5gU84u72C/4TfoAnmAO86p4vshnS8X9N79fT06d7WAtpP96uNf0VbYJ5A68S07SgE+E9pXp/mP9gI9WsvtSQRf03mKq6f6fFwKNoAHiY4nQ+T6fL83rvb8vBfTIWlB6yV0m2p9U9PZsf6nS7v9vWqNlg9rO7mOifU1g+kR46vSgPljs7vs7ZUt89/bKofXunvXuntXuhva69jrWv9Z61b61YrXvtW8sXevW678D/Ac2K/u6yC9p9wAAAABJRU5ErkJggg==';
      fs.writeFileSync(trayIconPath, Buffer.from(base64Data, 'base64'));
    }
    
    let useIconPath = trayIconPath;
    const prodIconPath = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(prodIconPath)) {
      useIconPath = prodIconPath;
    }
    
    const icon = nativeImage.createFromPath(useIconPath);
    tray = new Tray(icon);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Показать', click: () => { if(mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: 'Выход', click: () => { app.isQuiting = true; app.quit(); } }
    ]));
    tray.setToolTip('Layle Launcher');
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch(e) {
    console.error('Tray error:', e);
  }
});

app.on('before-quit', () => { app.isQuiting = true; });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
