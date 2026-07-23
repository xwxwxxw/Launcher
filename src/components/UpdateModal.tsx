import { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface UpdateModalProps {
  updateInfo: { version: string; notes: string; assets: any[] } | null;
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'installing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && (window as any).electron;
    if (isElectron) {
      const { ipcRenderer } = (window as any).electron;
      const handleProgress = (_: any, p: number) => setProgress(p);
      ipcRenderer.on('update-progress', handleProgress);
      return () => {
        ipcRenderer.removeAllListeners('update-progress');
      };
    }
  }, []);

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    const assets = updateInfo.assets || [];
    const isElectron = typeof window !== 'undefined' && (window as any).electron;

    if (isElectron) {
      const { ipcRenderer, shell } = (window as any).electron;
      const electProcess = (window as any).electron.process;
      const platform = electProcess?.platform || 'win32';
      
      let targetAsset = null;
      if (platform === 'win32') {
        targetAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe'));
      } else if (platform === 'darwin') {
        targetAsset = assets.find(a => a && a.name && (a.name.toLowerCase().endsWith('.dmg') || a.name.toLowerCase().endsWith('.zip')));
      } else {
        targetAsset = assets.find(a => a && a.name && (a.name.toLowerCase().endsWith('.appimage') || a.name.toLowerCase().endsWith('.deb') || a.name.toLowerCase().endsWith('.tar.gz')));
      }

      // If we couldn't find a platform-specific asset, just take the first one or .exe
      if (!targetAsset) {
        targetAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe')) || assets[0];
      }

      if (!targetAsset) {
        setErrorMsg('Не найден файл для автоматического обновления. Открываем страницу релизов...');
        setStatus('error');
        setTimeout(() => {
          const repo = (import.meta as any).env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher';
          if (shell) {
            shell.openExternal(`https://github.com/${repo}/releases/latest`);
          } else {
            window.open(`https://github.com/${repo}/releases/latest`, '_blank');
          }
        }, 2000);
        return;
      }

      // On non-Windows, we download via external browser
      if (platform !== 'win32') {
        setStatus('downloading');
        try {
          if (shell) {
            shell.openExternal(targetAsset.browser_download_url);
            setStatus('idle');
            onClose();
          } else {
            window.open(targetAsset.browser_download_url, '_blank');
            setStatus('idle');
            onClose();
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Ошибка открытия браузера');
          setStatus('error');
        }
        return;
      }

      // Windows automatic install flow
      setStatus('downloading');
      
      const shaAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe.sha256'));
      
      try {
        const result = await ipcRenderer.invoke('download-update', targetAsset.browser_download_url, shaAsset ? shaAsset.browser_download_url : null);
        if (result.success) {
          setStatus('installing');
          localStorage.setItem('pending_update_installer', result.tempPath);
          const installResult = await ipcRenderer.invoke('install-update', result.tempPath);
          if (installResult.success) {
            setStatus('completed');
            localStorage.removeItem('pending_update_installer');
            setTimeout(async () => {
              await ipcRenderer.invoke('restart-launcher');
            }, 1500);
          } else {
            setErrorMsg(installResult.error || 'Ошибка установки');
            setStatus('error');
            localStorage.removeItem('pending_update_installer');
          }
        } else {
          setErrorMsg(result.error || 'Ошибка скачивания');
          setStatus('error');
        }
      } catch (e: any) {
        setErrorMsg(e.message);
        setStatus('error');
      }
    } else {
      // Fallback for Web/Browser environment (AI Studio preview, Web testing, etc.)
      setStatus('downloading');
      try {
        const targetAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe')) ||
                            assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.zip')) ||
                            assets[0];
        
        if (targetAsset && targetAsset.browser_download_url) {
          window.open(targetAsset.browser_download_url, '_blank');
          setStatus('idle');
          onClose();
        } else {
          const repo = (import.meta as any).env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher';
          window.open(`https://github.com/${repo}/releases/latest`, '_blank');
          setStatus('idle');
          onClose();
        }
      } catch (e: any) {
        setErrorMsg(e.message);
        setStatus('error');
      }
    }
  };

  // Automatic update download removed so user can click the button
  // as per requirement "Пользователь нажимает кнопку..."

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
          {status === 'downloading' || status === 'installing' || status === 'completed' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {status === 'downloading' ? 'Скачивание...' : status === 'installing' ? 'Установка...' : status === 'completed' ? 'Успешно!' : status === 'error' ? 'Ошибка обновления' : 'Доступно обновление'}
        </h3>
        <button 
          onClick={onClose} 
          disabled={status === 'downloading' || status === 'installing' || status === 'completed'} 
          className="text-zinc-500 hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {status === 'error' ? (
        <div className="space-y-2 mb-4">
          <p className="text-red-400 text-sm font-semibold">Произошла ошибка:</p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-xs text-red-300 font-mono max-h-24 overflow-y-auto">
            {errorMsg}
          </div>
        </div>
      ) : status === 'completed' ? (
        <p className="text-emerald-400 text-sm mb-4 font-semibold">Лаунчер успешно обновлен! Автоматический перезапуск...</p>
      ) : (
        <>
          <p className="text-zinc-300 text-sm mb-2">
            Новая версия <strong>{updateInfo.version}</strong> готова к установке.
          </p>
          {updateInfo.notes && status === 'idle' && (
            <div className="bg-zinc-950 rounded-lg p-3 text-xs text-zinc-400 mb-4 max-h-32 overflow-y-auto markdown-body">
              <Markdown>{updateInfo.notes}</Markdown>
            </div>
          )}
        </>
      )}

      {status === 'idle' && (
        <div className="flex gap-3">
          <button 
            onClick={handleUpdate}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            Скачать и установить
          </button>
          <button 
            onClick={onClose}
            className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            Позже
          </button>
        </div>
      )}

      {(status === 'downloading' || status === 'installing' || status === 'completed') && (
        <div className="w-full mt-4">
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/20 shadow-inner">
            <div 
              className="h-full transition-all duration-300 rounded-full bg-emerald-500"
              style={{ width: `${status === 'downloading' ? progress : 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
            <span>
              {status === 'downloading' ? 'Скачивание...' : status === 'installing' ? 'Установка...' : 'Перезапуск...'}
            </span>
            <span>{status === 'downloading' ? `${progress}%` : '100%'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
