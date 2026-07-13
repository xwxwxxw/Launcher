import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  
  (localStorage as any).originalSetItem = originalSetItem;
  (localStorage as any).originalRemoveItem = originalRemoveItem;
  
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('save-settings', { [key]: value }).catch((e: any) => console.error(e));
      } catch (e) {}
    }
  };
  
  localStorage.removeItem = (key: string) => {
    originalRemoveItem(key);
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('delete-setting', key).catch((e: any) => console.error(e));
      } catch (e) {}
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
