import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import Markdown from 'react-markdown';

export default function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string, url: string, notes: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for updates
    fetch('/api/system/check-update')
      .then(res => res.json())
      .then(data => {
        if (data.updateAvailable) {
          setUpdateInfo(data);
        }
      })
      .catch(console.error);
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleUpdate = async () => {
    // Trigger update via Electron IPC if available
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('install-update', updateInfo.url);
        setDismissed(true);
        return;
      } catch (e) {}
    }
    // Fallback for web: open release page
    window.open(updateInfo.url, '_blank');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
          <Download size={18} />
          Доступно обновление
        </h3>
        <button onClick={() => setDismissed(true)} className="text-zinc-500 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <p className="text-zinc-300 text-sm mb-2">
        Новая версия <strong>{updateInfo.version}</strong> готова к установке.
      </p>
      {updateInfo.notes && (
        <div className="bg-zinc-950 rounded-lg p-3 text-xs text-zinc-400 mb-4 max-h-32 overflow-y-auto markdown-body">
          <Markdown>{updateInfo.notes}</Markdown>
        </div>
      )}
      <div className="flex gap-3">
        <button 
          onClick={handleUpdate}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
        >
          Обновить сейчас
        </button>
      </div>
    </div>
  );
}
