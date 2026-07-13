const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Inside useEffect for IPC
const targetUseEffect = `  useEffect(() => {
    // 1. Initial LocalStorage check
    const saved = localStorage.getItem('ely_session');
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. LocalStorage fallback check function`;

const replacementUseEffect = `  useEffect(() => {
    // Check main process for auth session
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on('session-restore', (event, authData) => {
        if (authData) {
          setUserProfile(authData);
          localStorage.setItem('ely_session', JSON.stringify(authData));
        }
      });
      // Try to ask for initial
      ipcRenderer.invoke('get-auth').then(authData => {
        if (authData) {
          setUserProfile(authData);
          localStorage.setItem('ely_session', JSON.stringify(authData));
        }
      }).catch(() => {});
    }

    // 1. Initial LocalStorage check
    const saved = localStorage.getItem('ely_session');
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. LocalStorage fallback check function`;

code = code.replace(targetUseEffect, replacementUseEffect);

const targetLogin = `  const handleAuthComplete = (profile: {name: string, id: string, accessToken: string}) => {
    setUserProfile(profile);
    localStorage.setItem('ely_session', JSON.stringify(profile));
    setShowAuthModal(false);
  };`;

const replacementLogin = `  const handleAuthComplete = (profile: {name: string, id: string, accessToken: string}) => {
    setUserProfile(profile);
    localStorage.setItem('ely_session', JSON.stringify(profile));
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('save-auth', profile).catch(() => {});
    }
    setShowAuthModal(false);
  };`;

code = code.replace(targetLogin, replacementLogin);

const targetLogout = `  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('ely_session');
  };`;

const replacementLogout = `  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('ely_session');
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('save-auth', null).catch(() => {});
    }
  };`;

code = code.replace(targetLogout, replacementLogout);

fs.writeFileSync('src/App.tsx', code);
