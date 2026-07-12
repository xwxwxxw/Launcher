export const openFolderInExplorer = async (folderPath: string) => {
  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('open-path', folderPath);
      return;
    } catch (e) {
      console.error('Failed to open folder in explorer via Electron:', e);
    }
  }

  // Fallback to server-side API call
  try {
    const res = await fetch('/api/utils/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      console.warn('Server failed to open folder, probably running inside container sandboxed environment:', res.statusText);
      alert('Открытие папок недоступно в веб-версии лаунчера. Пожалуйста, запустите лаунчер локально (десктопная версия).');
    }
  } catch (err) {
    console.error('Failed to open folder via backend API:', err);
    alert('Открытие папок недоступно в веб-версии лаунчера. Пожалуйста, используйте десктопную версию.');
  }
};
