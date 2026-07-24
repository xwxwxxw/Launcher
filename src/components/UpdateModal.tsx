import { useState, useEffect } from 'react';
import { Download, X, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { getEnv } from '../utils/env';

interface UpdateModalProps {
  updateInfo: { version: string; notes: string; assets: any[] } | null;
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'installing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadDetails, setDownloadDetails] = useState<{
    downloadedMB: string;
    totalMB: string;
    speedMBs: number;
  }>({ downloadedMB: '0.0', totalMB: '0.0', speedMBs: 0 });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && ((window as any).electron || (window as any).ipcRenderer || navigator.userAgent.toLowerCase().includes('electron'));
    if (isElectron) {
      const ipcRenderer = (window as any).electron?.ipcRenderer || (window as any).ipcRenderer;
      if (ipcRenderer) {
        const handleProgress = (_: any, data: any) => {
          if (typeof data === 'number') {
            setProgress(data);
          } else if (data && typeof data === 'object') {
            setProgress(data.percent || 0);
            setDownloadDetails({
              downloadedMB: ((data.downloadedBytes || 0) / (1024 * 1024)).toFixed(1),
              totalMB: ((data.totalBytes || 0) / (1024 * 1024)).toFixed(1),
              speedMBs: data.speedMBs || 0
            });
          }
        };
        ipcRenderer.on('update-progress', handleProgress);
        return () => {
          ipcRenderer.removeAllListeners('update-progress');
        };
      }
    }
  }, []);

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    setErrorMsg('');
    setProgress(0);
    setDownloadDetails({ downloadedMB: '0.0', totalMB: '0.0', speedMBs: 0 });

    const assets = updateInfo.assets || [];
    const isElectron = typeof window !== 'undefined' && (
      Boolean((window as any).electron) || 
      Boolean((window as any).ipcRenderer) || 
      navigator.userAgent.toLowerCase().includes('electron')
    );

    if (isElectron) {
      const electronObj = (window as any).electron;
      const ipcRenderer = electronObj?.ipcRenderer || (window as any).ipcRenderer;

      let targetAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe')) || assets[0];

      if (!targetAsset || !targetAsset.browser_download_url) {
        setErrorMsg('Не найден исполняемый файл (.exe) в релизе GitHub.');
        setStatus('error');
        return;
      }

      if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
        setErrorMsg('Ошибка подключения к модулю обновления Electron.');
        setStatus('error');
        return;
      }

      setStatus('downloading');
      const shaAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe.sha256'));

      try {
        const result = await ipcRenderer.invoke('download-update', targetAsset.browser_download_url, shaAsset ? shaAsset.browser_download_url : null);
        if (result && result.success) {
          setStatus('installing');
          const installResult = await ipcRenderer.invoke('install-update', result.tempPath);
          if (installResult && installResult.success) {
            setStatus('completed');
          } else {
            setErrorMsg(installResult?.error || 'Ошибка при установке обновления');
            setStatus('error');
          }
        } else {
          setErrorMsg(result?.error || 'Ошибка скачивания файла обновления');
          setStatus('error');
        }
      } catch (e: any) {
        setErrorMsg(e.message || 'Произошла ошибка при автоматическом обновлении');
        setStatus('error');
      }
    } else {
      // Browser preview mode: trigger direct attachment download via backend proxy
      setStatus('downloading');
      try {
        const targetAsset = assets.find(a => a && a.name && a.name.toLowerCase().endsWith('.exe')) || assets[0];
        if (targetAsset && targetAsset.browser_download_url) {
          const downloadUrl = `/api/updates/download-file?url=${encodeURIComponent(targetAsset.browser_download_url)}&filename=${encodeURIComponent(targetAsset.name || 'layle-launcher-setup.exe')}`;
          
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = targetAsset.name || 'layle-launcher-setup.exe';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setStatus('completed');
        } else {
          setErrorMsg('Файл обновления не найден в списке ресурсов.');
          setStatus('error');
        }
      } catch (e: any) {
        setErrorMsg(e.message || 'Ошибка загрузки обновления');
        setStatus('error');
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[420px] bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-emerald-400 font-bold text-base flex items-center gap-2">
          {status === 'downloading' || status === 'installing' ? (
            <Loader2 size={18} className="animate-spin text-emerald-400" />
          ) : status === 'completed' ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : status === 'error' ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <Download size={18} className="text-emerald-400" />
          )}
          {status === 'downloading'
            ? 'Скачивание обновления...'
            : status === 'installing'
            ? 'Установка и перезапуск...'
            : status === 'completed'
            ? 'Обновление завершено!'
            : status === 'error'
            ? 'Ошибка обновления'
            : 'Доступно новое обновление'}
        </h3>
        <button 
          onClick={onClose} 
          disabled={status === 'downloading' || status === 'installing' || status === 'completed'} 
          className="text-zinc-500 hover:text-white disabled:opacity-30 cursor-pointer p-1 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {status === 'error' ? (
        <div className="space-y-3 mb-4">
          <p className="text-red-400 text-xs font-medium">
            Не удалось выполнить автоматическое обновление:
          </p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 font-mono max-h-28 overflow-y-auto break-words">
            {errorMsg}
          </div>
          <p className="text-zinc-400 text-[11px]">
            Файл обновления сохранен во временной папке для диагностики. Вы можете попробовать запустить процесс повторно.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Повторить
            </button>
            <button
              onClick={onClose}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : status === 'completed' ? (
        <div className="space-y-2 mb-4">
          <p className="text-emerald-300 text-sm font-medium">
            Установка успешно завершена!
          </p>
          <p className="text-zinc-400 text-xs">
            Лаунчер перезапускается автоматически...
          </p>
        </div>
      ) : (
        <>
          <p className="text-zinc-300 text-sm mb-2">
            Доступна новая версия <strong className="text-emerald-400">{updateInfo.version}</strong>.
          </p>
          {updateInfo.notes && status === 'idle' && (
            <div className="bg-zinc-950 rounded-lg p-3 text-xs text-zinc-400 mb-4 max-h-32 overflow-y-auto markdown-body border border-zinc-800/50">
              <Markdown>{updateInfo.notes}</Markdown>
            </div>
          )}
        </>
      )}

      {status === 'idle' && (
        <div className="flex gap-3 mt-2">
          <button 
            onClick={handleUpdate}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Download size={16} />
            Скачать и установить обновление
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
        <div className="w-full mt-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60">
          <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
            <div 
              className="h-full transition-all duration-300 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${status === 'downloading' ? progress : 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2.5 font-mono text-[11px] text-zinc-400">
            <span className="font-medium text-zinc-300">
              {status === 'downloading' ? (
                downloadDetails.totalMB !== '0.0' ? (
                  `${downloadDetails.downloadedMB} МБ / ${downloadDetails.totalMB} МБ`
                ) : (
                  'Загрузка файла...'
                )
              ) : status === 'installing' ? (
                'Тихая установка в фоне...'
              ) : (
                'Перезапуск лаунчера...'
              )}
            </span>
            <span className="font-bold text-emerald-400">
              {status === 'downloading' ? (
                `${progress}% ${downloadDetails.speedMBs > 0 ? `(${downloadDetails.speedMBs} МБ/с)` : ''}`
              ) : (
                '100%'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
