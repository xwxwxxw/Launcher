const { contextBridge, ipcRenderer, shell, process } = require('electron');

const gdriveApiKey = process.env.VITE_GDRIVE_API_KEY || process.env.GDRIVE_API_KEY || "AIzaSyAvBduoyDjqZu3t_S8w7i8Qdl5e3SoHcok";
const gdriveFolderId = process.env.VITE_GDRIVE_FOLDER_ID || process.env.GDRIVE_FOLDER_ID || "1QaiLoo_bUEENvwkBogWPeerAU_VxrTFz";
const githubRepo = process.env.VITE_GITHUB_REPO || process.env.GITHUB_REPO || "xwxwxxw/Launcher";

console.log('[Electron Preload] Environment variables injected into renderer context:', {
  VITE_GDRIVE_API_KEY: gdriveApiKey ? `PRESENT (${gdriveApiKey.substring(0, 8)}...)` : 'MISSING',
  VITE_GDRIVE_FOLDER_ID: gdriveFolderId,
  VITE_GITHUB_REPO: githubRepo
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      let validChannels = ['window-minimize', 'window-maximize', 'window-close'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    invoke: (channel, ...args) => {
      let validChannels = ['check-updates', 'download-update', 'install-update', 'restart-launcher', 'delete-file', 'select-folder', 'open-dev-tools', 'elyLogin', 'microsoftLogin', 'get-app-version', 'get-auth', 'save-auth', 'save-settings', 'get-settings', 'delete-setting', 'select-directory', 'open-path', 'set-autostart', 'set-minimize-to-tray'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
    },
    on: (channel, func) => {
      let validChannels = ['session-restore', 'show-auth-modal', 'auth-success', 'update-progress', 'window-maximized', 'window-unmaximized'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
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
  },
  shell: {
    openPath: (path) => shell.openPath(path),
    showItemInFolder: (path) => shell.showItemInFolder(path),
    openExternal: (url) => shell.openExternal(url)
  },
  process: {
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VITE_GDRIVE_API_KEY: gdriveApiKey,
      GDRIVE_API_KEY: gdriveApiKey,
      VITE_GDRIVE_FOLDER_ID: gdriveFolderId,
      GDRIVE_FOLDER_ID: gdriveFolderId,
      VITE_GITHUB_REPO: githubRepo,
      GITHUB_REPO: githubRepo,
      VITE_APP_VERSION: process.env.VITE_APP_VERSION,
    },
    versions: process.versions
  },
  remote: {
    app: {
      getVersion: () => ipcRenderer.invoke('get-app-version')
    }
  }
});
