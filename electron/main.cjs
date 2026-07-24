const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const os = require('os');

// Load environment variables from .env in main process
const dotenv = require('dotenv');
const envFilename = '.env';
const potentialEnvPaths = [
  path.join(process.cwd(), envFilename),
  path.join(__dirname, envFilename),
  path.join(__dirname, '..', envFilename),
];
if (process.resourcesPath) {
  potentialEnvPaths.push(path.join(process.resourcesPath, envFilename));
}
if (process.execPath) {
  potentialEnvPaths.push(path.join(path.dirname(process.execPath), envFilename));
}

let loadedEnv = false;
for (const envPath of potentialEnvPaths) {
  try {
    const resolvedPath = path.resolve(envPath);
    if (fs.existsSync(resolvedPath)) {
      console.log(`[Electron-ENV] Loading environment variables from: ${resolvedPath}`);
      dotenv.config({ path: resolvedPath });
      loadedEnv = true;
    }
  } catch (e) {
    console.error(`[Electron-ENV] Failed to check/load from path ${envPath}:`, e);
  }
}
if (!loadedEnv) {
  try {
    dotenv.config();
  } catch (e) {}
}




// Default fallback configuration constants
const DEFAULT_GDRIVE_API_KEY = "AIzaSyAvBduoyDjqZu3t_S8w7i8Qdl5e3SoHcok";
const DEFAULT_GDRIVE_FOLDER_ID = "1QaiLoo_bUEENvwkBogWPeerAU_VxrTFz";
const DEFAULT_GITHUB_REPO = "xwxwxxw/Launcher";

process.env.GDRIVE_API_KEY = process.env.GDRIVE_API_KEY || process.env.VITE_GDRIVE_API_KEY || DEFAULT_GDRIVE_API_KEY;
process.env.VITE_GDRIVE_API_KEY = process.env.VITE_GDRIVE_API_KEY || process.env.GDRIVE_API_KEY;
process.env.GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID || process.env.VITE_GDRIVE_FOLDER_ID || DEFAULT_GDRIVE_FOLDER_ID;
process.env.VITE_GDRIVE_FOLDER_ID = process.env.VITE_GDRIVE_FOLDER_ID || process.env.GDRIVE_FOLDER_ID;
process.env.GITHUB_REPO = process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO || DEFAULT_GITHUB_REPO;
process.env.VITE_GITHUB_REPO = process.env.VITE_GITHUB_REPO || process.env.GITHUB_REPO;

console.log('[Electron Main] Resolved process.env configuration:', {
  GDRIVE_API_KEY: process.env.GDRIVE_API_KEY ? `PRESENT (${process.env.GDRIVE_API_KEY.substring(0, 8)}...)` : 'MISSING',
  GDRIVE_FOLDER_ID: process.env.GDRIVE_FOLDER_ID,
  GITHUB_REPO: process.env.GITHUB_REPO,
  loadedFromDotEnv: loadedEnv
});

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
global.minimizeToTray = true;
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
const sessionDir = path.join(app.getPath('userData'), 'session');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}
const authPath = path.join(sessionDir, 'auth.json');
const oldAuthPath = path.join(app.getPath('userData'), 'auth.json');
if (fs.existsSync(oldAuthPath) && !fs.existsSync(authPath)) {
  try {
    fs.renameSync(oldAuthPath, authPath);
  } catch (e) {}
}
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

try {
  if (fs.existsSync(settingsPath)) {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (s.launcher_minimize_tray === '0' || s.launcher_minimize_tray === false) {
      global.minimizeToTray = false;
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
  try {
    const dir = path.dirname(authPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (authData && typeof authData === 'object' && authData.name) {
      const authStr = JSON.stringify(authData, null, 2);
      fs.writeFileSync(authPath, authStr, 'utf8');
      fs.writeFileSync(oldAuthPath, authStr, 'utf8');

      // Also ensure settings.json keeps ely_session synced in userData
      try {
        let settings = {};
        if (fs.existsSync(settingsPath)) {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        settings.ely_session = JSON.stringify(authData);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      } catch (err) {}
    } else if (authData === null) {
      if (fs.existsSync(authPath)) fs.unlinkSync(authPath);
      if (fs.existsSync(oldAuthPath)) fs.unlinkSync(oldAuthPath);
      try {
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          delete settings.ely_session;
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        }
      } catch (err) {}
    }
    return true;
  } catch (e) {
    console.error('Failed to save auth to disk:', e);
    return false;
  }
});

ipcMain.handle('get-auth', () => {
  try {
    if (fs.existsSync(authPath)) {
      const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      if (data && data.name) return data;
    }
    if (fs.existsSync(oldAuthPath)) {
      const data = JSON.parse(fs.readFileSync(oldAuthPath, 'utf8'));
      if (data && data.name) return data;
    }
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings && settings.ely_session) {
        const parsed = typeof settings.ely_session === 'string' ? JSON.parse(settings.ely_session) : settings.ely_session;
        if (parsed && parsed.name) return parsed;
      }
    }
  } catch(e) {
    console.error('Failed to read auth:', e);
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

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
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
    const tempDir = app.getPath('temp') || os.tmpdir();
    const tempPath = path.join(tempDir, `layle-launcher-update-${Date.now()}.exe`);
    const logPath = path.join(tempDir, `layle-update-log-${Date.now()}.txt`);

    console.log('[Update] Starting automated download from:', assetUrl);

    // Stream download using native fetch (Node 18+) with redirect follow
    const response = await fetch(assetUrl, {
      headers: {
        'User-Agent': 'Layle-Minecraft-Launcher'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`GitHub download failed: HTTP ${response.status} ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
    const fileStream = fs.createWriteStream(tempPath);
    
    let downloadedBytes = 0;
    const startTime = Date.now();

    const { Readable } = require('stream');
    const nodeStream = Readable.fromWeb(response.body);

    nodeStream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
      const speedMBs = (downloadedBytes / (1024 * 1024)) / elapsedSec;
      const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

      event.sender.send('update-progress', {
        percent,
        downloadedBytes,
        totalBytes,
        speedMBs: parseFloat(speedMBs.toFixed(2))
      });
    });

    nodeStream.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', () => resolve());
      fileStream.on('error', (err) => reject(err));
      nodeStream.on('error', (err) => reject(err));
    });

    console.log('[Update] Download complete. Temp path:', tempPath, 'Size:', fs.statSync(tempPath).size);

    if (sha256AssetUrl) {
      try {
        const shaRes = await fetch(sha256AssetUrl, {
          headers: { 'User-Agent': 'Layle-Minecraft-Launcher' },
          redirect: 'follow'
        });
        if (shaRes.ok) {
          const shaText = await shaRes.text();
          const expectedSha = shaText.split(' ')[0].trim().toLowerCase();
          const fileBuffer = fs.readFileSync(tempPath);
          const actualSha = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();

          if (expectedSha && actualSha !== expectedSha) {
            fs.writeFileSync(logPath, `SHA256 mismatch!\nExpected: ${expectedSha}\nActual: ${actualSha}\nTime: ${new Date().toISOString()}`);
            return { success: false, error: 'Ошибка проверки целостности файла (SHA256 mismatch)' };
          }
        }
      } catch (e) {
        console.warn('[Update] SHA256 check warning:', e.message);
      }
    }

    return { success: true, tempPath };
  } catch (e) {
    console.error('[Update] Download error:', e);
    const tempDir = app.getPath('temp') || os.tmpdir();
    const logPath = path.join(tempDir, `layle-update-error-${Date.now()}.log`);
    try {
      fs.writeFileSync(logPath, `Download error: ${e.stack || e.message}\nTime: ${new Date().toISOString()}`);
    } catch (_) {}
    return { success: false, error: e.message };
  }
});

ipcMain.handle('install-update', async (event, tempPath) => {
  try {
    if (!tempPath || !fs.existsSync(tempPath)) {
      return { success: false, error: 'Файл обновления не найден во временной папке' };
    }

    if (!app.isPackaged) {
      console.log('Dev mode: simulating silent update installation for path:', tempPath);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    }

    const exePath = process.execPath;
    const currentPid = process.pid;

    if (process.platform === 'win32') {
      const tempDir = app.getPath('temp') || os.tmpdir();
      const cmdPath = path.join(tempDir, `layle_silent_update_${Date.now()}.cmd`);

      const cmdScript = `@echo off
chcp 65001 > nul
:wait_proc
tasklist /fi "PID eq ${currentPid}" 2>NUL | find "${currentPid}" >NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 /nobreak >nul
    goto wait_proc
)
timeout /t 1 /nobreak >nul
start /wait "" "${tempPath}" /S
timeout /t 2 /nobreak >nul
if exist "${tempPath}" del /f /q "${tempPath}"
if exist "${exePath}" start "" "${exePath}"
(goto) 2>nul & del /f /q "%~f0"
`;

      fs.writeFileSync(cmdPath, cmdScript, 'utf-8');

      const { spawn } = require('child_process');
      const child = spawn('cmd.exe', ['/c', `"${cmdPath}"`], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true
      });
      child.unref();

      setTimeout(() => {
        app.isQuiting = true;
        app.exit(0);
      }, 300);

      return { success: true };
    } else {
      const { spawn } = require('child_process');
      const child = spawn(tempPath, ['/S'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        app.isQuiting = true;
        app.relaunch();
        app.exit(0);
      }, 300);

      return { success: true };
    }
  } catch (e) {
    console.error('Update install error:', e);
    const tempDir = app.getPath('temp') || os.tmpdir();
    const logPath = path.join(tempDir, `layle-update-install-error-${Date.now()}.log`);
    try {
      fs.writeFileSync(logPath, `Install error: ${e.stack || e.message}\nTime: ${new Date().toISOString()}`);
    } catch (_) {}
    return { success: false, error: e.message };
  }
});

ipcMain.handle('restart-launcher', async () => {
  try {
    const { spawn } = require('child_process');
    const exePath = process.execPath;
    
    spawn(exePath, [], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    app.isQuiting = true;
    app.quit();
    return { success: true };
  } catch (e) {
    console.error('Restart failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-file', async (event, targetPath) => {
  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
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
  let windowIconPath = path.join(__dirname, '../public/icon.png');
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, '../dist/icon.png');
  }
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, '../public/icon.ico');
  }
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, '../dist/icon.ico');
  }
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, '../icon.png');
  }
  if (!fs.existsSync(windowIconPath)) {
    windowIconPath = path.join(__dirname, '../icon.ico');
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



  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
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
  // Cleanup old backup exe if it exists from a previous successful update
  try {
    const oldExePath = process.execPath + '.old';
    if (fs.existsSync(oldExePath)) {
      fs.unlinkSync(oldExePath);
    }
  } catch (e) {
    console.error('Failed to clean up old exe backup:', e);
  }

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
