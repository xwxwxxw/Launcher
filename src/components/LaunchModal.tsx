import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, Loader2, Gamepad2 } from 'lucide-react';

interface LaunchModalProps {
  onClose: () => void;
  profileName: string;
  userProfile: {name: string, id: string, accessToken: string} | null;
  onGameStatusChange?: (status: 'idle' | 'installing' | 'running') => void;
}

export default function LaunchModal({ onClose, profileName, userProfile, onGameStatusChange }: LaunchModalProps) {
  const [logs, setLogs] = useState<{msg: string, time: string}[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<any>('initializing');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    setStatus('launching');
    if (onGameStatusChange) onGameStatusChange('installing');

    const profileId = localStorage.getItem('launcher_active_profile_id') || '1';
    const ram = localStorage.getItem('launcher_ram') || '4096';
    const javaPath = localStorage.getItem('launcher_java_path') || '';
    const minecraftPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';
    const resWidth = localStorage.getItem('launcher_res_width') || '1280';
    const resHeight = localStorage.getItem('launcher_res_height') || '720';
    const fullscreen = localStorage.getItem('launcher_fullscreen') || '0';
    const jvmArgs = localStorage.getItem('launcher_jvm_args') || '';

    const query = new URLSearchParams({
      profileId,
      ram,
      javaPath,
      minecraftPath,
      resWidth,
      resHeight,
      fullscreen,
      jvmArgs
    });

    if (userProfile) {
      query.set('authName', userProfile.name);
      query.set('authUuid', userProfile.id);
      query.set('authAccess', userProfile.accessToken);
    } else {
      const offlineUsername = localStorage.getItem('offline_username') || 'LaylePlayer';
      // Use standard deterministic UUID for offline nickname
      const offlineUuid = '00000000-0000-0000-0000-' + offlineUsername.toLowerCase().padEnd(12, '0').substring(0, 12);
      query.set('authName', offlineUsername);
      query.set('authUuid', offlineUuid);
      query.set('authAccess', 'offline-token');
    }

    const eventSource = new EventSource(`/api/minecraft/launch?${query.toString()}`);
    
    eventSource.addEventListener('log', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(prev => [...prev, { msg: data.message, time }]);
      setProgress(data.progress);
    });

    eventSource.addEventListener('done', (e: any) => {
      setStatus('running');
      if (onGameStatusChange) onGameStatusChange('running');
    });

    eventSource.addEventListener('game_closed', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (data.code !== 0) {
        if (data.crashMessage) {
           setLogs(prev => [...prev, { msg: `КРИТИЧЕСКАЯ ОШИБКА: ${data.crashMessage}`, time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
        }
        if (data.outOfMemory) {
           setTimeout(() => alert("Недостаточно памяти! Пожалуйста, увеличьте RAM для этой сборки в настройках профиля."), 500);
        }
        setStatus('error');
      } else {
        setStatus('closed');
      }
      
      if (onGameStatusChange) onGameStatusChange('idle');
      eventSource.close();
    });

    eventSource.addEventListener('error', (e: any) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(prev => [...prev, { msg: `Ошибка: ${data}`, time }]);
      setStatus('error');
      eventSource.close();
    });

    eventSource.onerror = (err) => {
      setStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      {status === 'running' ? (
        <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-md p-10 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.15)] relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></div>
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Игра запущена</h2>
          <p className="text-sm text-zinc-400 text-center mb-8">
             Процесс Minecraft ({profileName}) успешно запущен и работает в фоновом режиме. Вы можете свернуть лаунчер.
          </p>
          <button onClick={onClose} className="bg-zinc-800 text-white hover:bg-zinc-700 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
            Скрыть окно
          </button>
        </div>
      ) : (
        <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-zinc-900/30 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                <Gamepad2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Запуск игры</h2>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-bold">{profileName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Progress Section */}
          <div className="p-8 pb-4 relative z-10">
            <div className="flex justify-between items-end mb-3">
              <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                {status === 'error' ? (
                  <span className="text-red-400 flex items-center gap-2 font-extrabold animate-pulse">
                    ● Ошибка запуска
                  </span>
                ) : (
                  <div className="text-zinc-300 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-purple-400" /> 
                    <span>Установка и подготовка...</span>
                  </div>
                )}
              </div>
              <span className={`text-xl font-bold font-mono ${status === 'error' ? 'text-red-500' : 'text-zinc-500'}`}>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800/50 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-purple-500'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {status === 'error' && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs leading-relaxed">
                <span className="font-bold uppercase tracking-wider block mb-1">Совет по устранению неполадок:</span>
                Пожалуйста, убедитесь, что у вас стабильное подключение к интернету, выбран правильный путь к Java и выделено достаточно оперативной памяти (RAM) в настройках профиля.
              </div>
            )}
          </div>

          {/* Terminal / Logs */}
          <div className="px-8 pb-6 flex-1">
            <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 h-60 overflow-y-auto font-mono text-xs flex flex-col gap-1.5 shadow-inner scrollbar-none">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-zinc-400 hover:bg-zinc-900/50 px-2 py-0.5 rounded transition-colors animate-in slide-in-from-bottom-2 duration-300 fade-in">
                  <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                  <span className={log.msg.toLowerCase().includes('ошибка') || log.msg.toLowerCase().includes('error') ? 'text-red-400 font-medium' : 'text-zinc-300'}>{log.msg}</span>
                </div>
              ))}
              {status !== 'error' && status !== 'running' && (
                <div className="flex gap-3 text-zinc-600 px-2 py-0.5 animate-pulse">
                  <span>[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                  <span>Ожидание процесса...</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Footer controls when completed or errored */}
          {(status === 'error' || status === 'closed') && (
            <div className="px-8 pb-8 flex justify-end gap-3 border-t border-zinc-800/40 pt-4 bg-zinc-900/10">
              <button
                onClick={onClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Закрыть окно
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
