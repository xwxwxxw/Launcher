const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const os = require('os');



const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// Set App User Model ID for Windows taskbar grouping and icon mapping
if (process.platform === 'win32') {
  app.setAppUserModelId('com.layle.launcher');
}

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

ipcMain.handle('elyLogin', async (event, params) => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const activePort = process.env.PORT || '3000';
    const origin = `http://localhost:${activePort}`;

    const urlParams = new URLSearchParams();
    urlParams.append('origin', origin);
    if (params?.customClientId) urlParams.append('client_id', params.customClientId);
    if (params?.customClientSecret) urlParams.append('client_secret', params.customClientSecret);

    const loginUrl = `${origin}/api/auth/ely/url?${urlParams.toString()}`;

    // Intercept redirect to localhost:3000 to route to the correct dynamic port
    authWindow.webContents.on('will-redirect', (e, url) => {
      const redirectPrefix = 'http://localhost:3000/api/auth/ely/callback';
      if (url.startsWith(redirectPrefix)) {
        e.preventDefault();
        const targetUrl = url.replace('http://localhost:3000', `http://localhost:${activePort}`);
        authWindow.loadURL(targetUrl);
      }
    });

    authWindow.webContents.on('will-navigate', (e, url) => {
      const redirectPrefix = 'http://localhost:3000/api/auth/ely/callback';
      if (url.startsWith(redirectPrefix)) {
        e.preventDefault();
        const targetUrl = url.replace('http://localhost:3000', `http://localhost:${activePort}`);
        authWindow.loadURL(targetUrl);
      }
    });

    authWindow.loadURL(loginUrl);
    authWindow.show();

    let resolved = false;

    // We can intercept the success page by listening to title changes or injecting a script
    authWindow.webContents.on('did-finish-load', async () => {
      try {
        const title = authWindow.getTitle();
        // The callback page in server.ts sets localStorage and window.opener.postMessage
        // Let's just execute JS to read localStorage
        const pendingSession = await authWindow.webContents.executeJavaScript('localStorage.getItem("ely_session_pending")');
        if (pendingSession) {
          const profile = JSON.parse(pendingSession);
          await authWindow.webContents.executeJavaScript('localStorage.removeItem("ely_session_pending")');
          if (!resolved) {
            resolved = true;
            authWindow.close();
            resolve(profile);
          }
        }
      } catch (e) {
        console.error('Failed to check auth status in popup:', e);
      }
    });

    authWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('Окно авторизации было закрыто'));
      }
    });
  });
});

ipcMain.handle('getUserData', () => {
  return null; // Implemented in React, but added for compatibility with prompt
});

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
    if (global.minimizeToTray) {
      if (!app.isQuiting) {
        mainWindow.hide();
      } else {
        mainWindow.close();
      }
    } else {
      app.isQuiting = true;
      app.quit();
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
          
          const isNewerVersion = (latest, current) => {
            const lParts = latest.replace(/[^0-9.]/g, '').split('.').map(Number);
            const cParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);
            for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
              const l = lParts[i] || 0;
              const c = cParts[i] || 0;
              if (l > c) return true;
              if (l < c) return false;
            }
            return false;
          };

          if (latestVersion !== currentVersion && isNewerVersion(latestVersion, currentVersion)) {
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
  try {
    const tempPath = path.join(os.tmpdir(), `launcher-update-${Date.now()}.exe`);
    
    const downloadFile = (url, dest) => {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : require('http');
        
        const request = protocol.get(url, {
          headers: { 'User-Agent': 'Minecraft-Launcher' }
        }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            // Handle redirects
            file.close();
            downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            return;
          }
          
          if (response.statusCode !== 200) {
            file.close();
            fs.unlink(dest, () => {});
            return reject(new Error(`Не удалось скачать файл: HTTP ${response.statusCode}`));
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close(resolve);
          });
        });
        
        request.on('error', (err) => {
          file.close();
          fs.unlink(dest, () => {});
          reject(err);
        });
      });
    };

    const downloadText = async (url) => {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Minecraft-Launcher' }
      });
      if (!response.ok) {
        throw new Error(`Не удалось получить данные: HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    };

    await downloadFile(assetUrl, tempPath);

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
           return { success: false, error: 'SHA256 mismatch' };
        }
      } catch (e) {
        console.error('SHA verification failed:', e);
      }
    }
    
    return { success: true, tempPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('install-update', async (event, tempPath) => {
  try {
    const { spawn } = require('child_process');
    
    // Launch the downloaded installer directly from the temp folder
    // This allows the installer to run independently, overwrite the launcher files,
    // and avoids Windows locking the installer executable itself inside the app folder.
    spawn(tempPath, [], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    // Instantly close the launcher so that all launcher files are unlocked and ready to be overwritten by the installer
    app.isQuiting = true;
    app.quit();
    return { success: true };
  } catch (e) {
    console.error('Update install failed:', e);
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
  const isWin = process.platform === 'win32';
  const iconFileName = isWin ? 'icon.ico' : 'icon.png';
  let windowIconPath = path.join(__dirname, `../public/${iconFileName}`);
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, `../dist/${iconFileName}`);
  }
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, `../${iconFileName}`);
  }
  const winIcon = fs.existsSync(windowIconPath) ? nativeImage.createFromPath(windowIconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: winIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#09090b',
    show: true
  });



  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
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
    
    // Resize icon for tray specifically (16x16 or 32x32) to prevent transparent square issue
    let icon = nativeImage.createFromPath(useIconPath);
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }
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
