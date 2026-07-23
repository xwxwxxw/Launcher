const { contextBridge, ipcRenderer, shell, process } = require('electron');

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
      VITE_GDRIVE_API_KEY: process.env.VITE_GDRIVE_API_KEY || process.env.GDRIVE_API_KEY,
      VITE_GDRIVE_FOLDER_ID: process.env.VITE_GDRIVE_FOLDER_ID || process.env.GDRIVE_FOLDER_ID,
      VITE_GITHUB_REPO: process.env.VITE_GITHUB_REPO || process.env.GITHUB_REPO,
      VITE_APP_VERSION: process.env.VITE_APP_VERSION,
      GDRIVE_API_KEY: process.env.GDRIVE_API_KEY || process.env.VITE_GDRIVE_API_KEY,
      GDRIVE_FOLDER_ID: process.env.GDRIVE_FOLDER_ID || process.env.VITE_GDRIVE_FOLDER_ID,
      GITHUB_REPO: process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO,
    },
    versions: process.versions
  },
  remote: {
    app: {
      getVersion: () => ipcRenderer.invoke('get-app-version')
    }
  }
});
