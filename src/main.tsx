import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.timeEnd('2. createWindow -> ready-to-show'); // Just in case it's in browser context
console.time('3. React First Render');

function AppWrapper() {
  useEffect(() => {
    console.timeEnd('3. React First Render');
  }, []);
  return <App />;
}

if (typeof window !== 'undefined') {


  let safeLocalStorage: Storage;
  let isInMemory = false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    safeLocalStorage = window.localStorage;
  } catch (e) {
    console.warn('localStorage is blocked or threw an error (likely inside sandboxed iframe). Using in-memory fallback.');
    isInMemory = true;
    const store: Record<string, string> = {};
    safeLocalStorage = {
      length: 0,
      clear() {
        for (const k in store) delete store[k];
        this.length = 0;
      },
      getItem(key: string) {
        return store[key] || null;
      },
      key(index: number) {
        return Object.keys(store)[index] || null;
      },
      removeItem(key: string) {
        delete store[key];
        this.length = Object.keys(store).length;
      },
      setItem(key: string, value: string) {
        store[key] = String(value);
        this.length = Object.keys(store).length;
      }
    } as Storage;

    try {
      Object.defineProperty(window, 'localStorage', {
        value: safeLocalStorage,
        writable: true,
        configurable: true
      });
    } catch (err) {
      console.error('Failed to redefine window.localStorage:', err);
    }
  }

  const originalSetItem = safeLocalStorage.setItem.bind(safeLocalStorage);
  const originalRemoveItem = safeLocalStorage.removeItem.bind(safeLocalStorage);
  
  (safeLocalStorage as any).originalSetItem = originalSetItem;
  (safeLocalStorage as any).originalRemoveItem = originalRemoveItem;
  
  safeLocalStorage.setItem = (key: string, value: string) => {
    try {
      originalSetItem(key, value);
    } catch (e) {}
    if ((window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        ipcRenderer.invoke('save-settings', { [key]: value }).catch((e: any) => console.error(e));
      } catch (e) {}
    }
  };
  
  safeLocalStorage.removeItem = (key: string) => {
    try {
      originalRemoveItem(key);
    } catch (e) {}
    if ((window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        ipcRenderer.invoke('delete-setting', key).catch((e: any) => console.error(e));
      } catch (e) {}
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
);
