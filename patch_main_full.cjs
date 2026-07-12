const fs = require('fs');

const content = `const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const net = require('net');
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// IPC Listener to select directories natively
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

// IPC Listener to open folders/paths in Windows Explorer natively
ipcMain.handle('open-path', async (event, dirPath) => {
  if (dirPath) {
    const fs = require('fs');
    // Resolve relative paths
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
    
    // Ensure the folder exists
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

// Helper to find a free port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer(function(sock) {
      sock.end('Hello world\\n');
    });
    srv.listen(0, function() {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    show: false
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    // Set environment to production
    process.env.NODE_ENV = 'production';
    
    try {
      const freePort = await getFreePort();
      process.env.PORT = String(freePort);
      
      // Set CWD to user data so that all paths relative to CWD go to a writable location
      process.chdir(app.getPath('userData'));
      
      // Start the express server
      require(path.join(__dirname, '../dist/server.cjs'));
      
      // Wait for the server to start, then load
      setTimeout(() => {
        win.loadURL(\`http://localhost:\${freePort}\`);
      }, 1000);
    } catch (err) {
      console.error('Server start failed:', err);
      dialog.showErrorBox('Server Error', String(err));
    }
  }
}

app.whenReady().then(createWindow);

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
`;

fs.writeFileSync('electron/main.cjs', content);
