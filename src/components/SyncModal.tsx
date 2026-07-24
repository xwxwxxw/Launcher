import { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Minus, Maximize2 } from 'lucide-react';
import { Profile } from '../types';
import { gdsyncState } from '../utils/gdsync';
import { getEnv } from '../utils/env';
import LogTerminal from './LogTerminal';

interface SyncModalProps {
  onClose: (didSyncSucceed?: boolean) => void;
  profileId: string;
  profile: Profile;
}

export default function SyncModal({ onClose, profileId, profile }: SyncModalProps) {
  const [logs, setLogs] = useState<{ msg: string; time: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>('syncing');
  const [errorMsg, setErrorMsg] = useState('');
  const [successSummaryMsg, setSuccessSummaryMsg] = useState('');
  const [tagName, setTagName] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const minecraftPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';

    const query = new URLSearchParams({
      profileId,
      minecraftPath,
      syncSource: 'gdrive',
      gdriveFolderId: profile.gdriveFolderId || getEnv('VITE_GDRIVE_FOLDER_ID') || getEnv('GDRIVE_FOLDER_ID') || '',
      gdriveToken: getEnv('VITE_GDRIVE_API_KEY') || getEnv('GDRIVE_API_KEY') || ''
    });

    setStatus('syncing');
    gdsyncState.updateState({
      isSyncing: true,
      progress: 0,
      status: 'syncing',
      lastError: null
    });

    const eventSource = new EventSource(`/api/sync-build?${query.toString()}`);
    const timeNow = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    eventSource.addEventListener('status', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      setLogs(prev => [...prev, { msg: data.message, time: timeNow() }]);
      if (data.progress !== undefined) {
        setProgress(data.progress);
        gdsyncState.updateState({ progress: data.progress });
      }
    });

    eventSource.addEventListener('success', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      setLogs(prev => [...prev, { msg: data.message, time: timeNow() }]);
      setProgress(100);
      setTagName(data.tag || 'latest');
      setSuccessSummaryMsg(data.message || '');
      setStatus('success');
      gdsyncState.updateState({
        isSyncing: false,
        progress: 100,
        status: 'success',
        lastSyncTime: new Date().toISOString()
      });
      eventSource.close();
    });

    eventSource.addEventListener('error', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      setLogs(prev => [...prev, { msg: `ОШИБКА: ${data.message}`, time: timeNow() }]);
      setErrorMsg(data.message);
      setStatus('error');
      gdsyncState.updateState({
        isSyncing: false,
        status: 'error',
        lastError: data.message
      });
      eventSource.close();
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) return;
      setLogs(prev => {
        const last = prev[prev.length - 1];
        if (last && (last.msg.includes('ОШИБКА') || last.msg.includes('заверш'))) {
          return prev;
        }
        return [...prev, { msg: 'ОШИБКА: Прервано соединение с сервером синхронизации.', time: timeNow() }];
      });
      setErrorMsg('Прервано соединение с сервером.');
      setStatus('error');
      gdsyncState.updateState({
        isSyncing: false,
        status: 'error',
        lastError: 'Прервано соединение с сервером.'
      });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [profileId, profile]);


  
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-purple-400">
            <Loader2 size={16} className={status === 'syncing' ? 'animate-spin' : ''} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status === 'syncing' ? 'Синхронизация...' : status === 'success' ? 'Завершено' : status === 'error' ? 'Ошибка' : 'Обновление'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(false)} className="text-zinc-500 hover:text-white p-1 rounded-md transition-colors" title="Развернуть">
              <Maximize2 size={14} />
            </button>
            <button onClick={() => onClose(status === 'success')}  className="text-zinc-500 hover:text-white p-1 rounded-md disabled:opacity-50 transition-colors cursor-pointer" title="Закрыть">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="w-full mt-2">
          <div className="flex justify-between items-center mb-1 font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
            <span className="truncate pr-2">{status === 'error' ? errorMsg : (logs[logs.length-1]?.msg || 'Подключение...')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/20 shadow-inner">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                status === 'error' ? 'bg-red-500' : (status === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-500 to-purple-400')
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#09090b]/85 backdrop-blur-md flex items-center justify-center z-50 p-6">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <RefreshCw className={`text-purple-400 ${status === 'syncing' ? 'animate-spin' : ''}`} size={20} />
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Синхронизация Сборки</h3>
              <p className="text-[10px] text-zinc-500 font-medium">
                Синхронизация игрового клиента с Google Диском
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer"
              title="Свернуть"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={() => onClose(status === 'success')}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
              title={status === 'syncing' ? "Принудительно остановить и закрыть" : "Закрыть"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Status Progress */}
        <div className="p-8 flex flex-col items-center border-b border-zinc-900/50 bg-gradient-to-b from-purple-950/5 to-transparent">
          {status === 'syncing' && (
            <>
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <Loader2 className="animate-spin text-purple-400 absolute w-full h-full" size={48} strokeWidth={1.5} />
                <span className="text-xs font-mono font-bold text-zinc-300">{progress}%</span>
              </div>
              <h4 className="text-zinc-100 font-semibold text-center mb-2 animate-pulse text-sm">
                Выполняется синхронизация файлов...
              </h4>
              <p className="text-xs text-zinc-500 text-center max-w-md">
                Пожалуйста, не закрывайте лаунчер. Идет загрузка необходимых модов, текстур и файлов конфигурации.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-emerald-400 font-bold text-center mb-2">Синхронизация завершена успешно!</h4>
              {successSummaryMsg && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5 my-2 text-center max-w-lg">
                  <p className="text-xs font-bold text-emerald-200 leading-relaxed">
                    {successSummaryMsg}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-zinc-500 text-center mt-1">
                Личные настройки (сервера, управление, синглплеерные миры) полностью сохранены.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-5 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <AlertTriangle size={32} />
              </div>
              <h4 className="text-red-400 font-bold text-center mb-2">Сбой при обновлении сборки</h4>
              <p className="text-xs text-zinc-400 text-center max-w-md mb-4 font-medium">
                {errorMsg || 'Произошла непредвиденная ошибка.'}
              </p>
            </>
          )}

          {/* Progress Bar */}
          <div className="w-full mt-8">
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/20 shadow-inner">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  status === 'error' ? 'bg-red-500' : (status === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-500 to-purple-400')
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
              <span>ПРОГРЕСС</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>

        {/* Live Terminal Output Console */}
        <div className="p-6 border-b border-zinc-900 bg-zinc-950/40">
          <LogTerminal
            logs={logs}
            title="Лог синхронизации GDsync"
            subtitle="Терминал обновления"
            profileId={profileId}
            minecraftPath={localStorage.getItem('launcher_minecraft_path') || './.minecraft'}
            heightClass="h-64 min-h-[220px]"
          />
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-zinc-900/10 flex justify-end">
          <button
            onClick={() => onClose(status === 'success')}
            
            className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            {status === 'syncing' ? 'Пожалуйста, подождите...' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}
