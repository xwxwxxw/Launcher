const { contextBridge, ipcRenderer, shell } = require('electron');

let gdriveApiKey = "AIzaSyAvBduoyDjqZu3t_S8w7i8Qdl5e3SoHcok";
let gdriveFolderId = "1QaiLoo_bUEENvwkBogWPeerAU_VxrTFz";
let githubRepo = "xwxwxxw/Launcher";
let procEnv = {};
let procPlatform = "win32";
let procVersions = {};

try {
  if (typeof process !== 'undefined') {
    procPlatform = process.platform || procPlatform;
    procVersions = process.versions || procVersions;
    if (process.env) {
      procEnv = process.env;
      if (process.env.VITE_GDRIVE_API_KEY || process.env.GDRIVE_API_KEY) {
        gdriveApiKey = process.env.VITE_GDRIVE_API_KEY || process.env.GDRIVE_API_KEY;
      }
      if (process.env.VITE_GDRIVE_FOLDER_ID || process.env.GDRIVE_FOLDER_ID) {
        gdriveFolderId = process.env.VITE_GDRIVE_FOLDER_ID || process.env.GDRIVE_FOLDER_ID;
      }
      if (process.env.VITE_GITHUB_REPO || process.env.GITHUB_REPO) {
        githubRepo = process.env.VITE_GITHUB_REPO || process.env.GITHUB_REPO;
      }
    }
  }
} catch (e) {
  console.error("Error accessing process in preload:", e);
}

console.log('[Electron Preload] Environment variables injected into renderer context:', {
  VITE_GDRIVE_API_KEY: gdriveApiKey ? `PRESENT (${gdriveApiKey.substring(0, 8)}...)` : 'MISSING',
  VITE_GDRIVE_FOLDER_ID: gdriveFolderId,
  VITE_GITHUB_REPO: githubRepo
});

const ipcRendererWrapper = {
  send: (channel, data) => {
    let validChannels = ['window-minimize', 'window-maximize', 'window-close', 'window-show'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  invoke: (channel, ...args) => {
    let validChannels = ['check-updates', 'download-update', 'install-update', 'restart-launcher', 'delete-file', 'select-folder', 'open-dev-tools', 'elyLogin', 'microsoftLogin', 'get-app-version', 'get-auth', 'save-auth', 'save-settings', 'get-settings', 'delete-setting', 'select-directory', 'open-path', 'set-autostart', 'set-minimize-to-tray', 'window-is-maximized'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },
  on: (channel, func) => {
    let validChannels = ['session-restore', 'show-auth-modal', 'auth-success', 'update-progress', 'window-maximized', 'window-unmaximized'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
    }
  },
  once: (channel, func) => {
      let validChannels = ['auth-success', 'update-progress'];
      if (validChannels.includes(channel)) {
          ipcRenderer.once(channel, (event, ...args) => func(event, ...args));
      }
  },
  removeAllListeners: (channel) => {
    let validChannels = ['session-restore', 'show-auth-modal', 'auth-success', 'update-progress', 'window-maximized', 'window-unmaximized'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
};

contextBridge.exposeInMainWorld('electron', {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    unmaximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    show: () => ipcRenderer.send('window-show'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },
  ipcRenderer: ipcRendererWrapper,
  shell: {
    openPath: (path) => shell.openPath(path),
    showItemInFolder: (path) => shell.showItemInFolder(path),
    openExternal: (url) => shell.openExternal(url)
  },
  process: {
    platform: procPlatform,
    env: {
      NODE_ENV: procEnv.NODE_ENV,
      VITE_GDRIVE_API_KEY: gdriveApiKey,
      GDRIVE_API_KEY: gdriveApiKey,
      VITE_GDRIVE_FOLDER_ID: gdriveFolderId,
      GDRIVE_FOLDER_ID: gdriveFolderId,
      VITE_GITHUB_REPO: githubRepo,
      GITHUB_REPO: githubRepo,
      VITE_APP_VERSION: procEnv.VITE_APP_VERSION,
    },
    versions: procVersions
  },
  remote: {
    app: {
      getVersion: () => ipcRenderer.invoke('get-app-version')
    }
  }
});

contextBridge.exposeInMainWorld('ipcRenderer', ipcRendererWrapper);
