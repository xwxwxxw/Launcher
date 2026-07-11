const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
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
    
    // Pick a port dynamically, but for simplicity we'll just try 3000 and increment if needed
    // However, server.cjs binds to process.env.PORT || 3000
    // To ensure the server knows where dist is:
    process.chdir(path.join(__dirname, '..'));

    // Start the express server
    require(path.join(__dirname, '../dist/server.cjs'));
    
    // Wait for the server to start, then load
    setTimeout(() => {
      win.loadURL('http://localhost:3000');
    }, 1000);
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
