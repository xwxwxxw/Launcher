import { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface UpdateModalProps {
  updateInfo: { version: string; notes: string; assets: any[] } | null;
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'installing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const { ipcRenderer } = (window as any).electron;
      
      const exeAsset = updateInfo.assets.find(a => a.name.endsWith('.exe'));
      if (!exeAsset) {
        setErrorMsg('Не найден .exe файл для обновления');
        setStatus('error');
        return;
      }
      
      setStatus('downloading');
      
      const shaAsset = updateInfo.assets.find(a => a.name.endsWith('.exe.sha256'));
      
      try {
        const result = await ipcRenderer.invoke('download-update', exeAsset.browser_download_url, shaAsset ? shaAsset.browser_download_url : null);
        if (result.success) {
          setStatus('installing');
          const installResult = await ipcRenderer.invoke('install-update', result.tempPath);
          if (!installResult.success) {
            setErrorMsg(installResult.error || 'Ошибка установки');
            setStatus('error');
          }
        } else {
          setErrorMsg(result.error || 'Ошибка скачивания');
          setStatus('error');
        }
      } catch (e: any) {
        setErrorMsg(e.message);
        setStatus('error');
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
          {status === 'downloading' || status === 'installing' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {status === 'downloading' ? 'Скачивание...' : status === 'installing' ? 'Установка...' : status === 'error' ? 'Ошибка обновления' : 'Доступно обновление'}
        </h3>
        <button 
          onClick={onClose} 
          disabled={status === 'downloading' || status === 'installing'} 
          className="text-zinc-500 hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {status === 'error' ? (
        <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
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
    </div>
  );
}
