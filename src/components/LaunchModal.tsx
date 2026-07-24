import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, Loader2, Gamepad2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import LogTerminal from './LogTerminal';

interface LaunchModalProps {
  onClose: () => void;
  profileName: string;
  userProfile: {name: string, id: string, accessToken: string} | null;
  onGameStatusChange?: (status: 'idle' | 'installing' | 'running') => void;
}

export default function LaunchModal({ onClose, profileName, userProfile, onGameStatusChange }: LaunchModalProps) {
  const [logs, setLogs] = useState<{msg: string, time: string}[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<any>('checking');
  const [fabricWarning, setFabricWarning] = useState<any>(null);
  const [updatingFabric, setUpdatingFabric] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startLaunch = () => {
    setFabricWarning(null);
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
      const offlineUuid = '00000000-0000-0000-0000-' + offlineUsername.toLowerCase().padEnd(12, '0').substring(0, 12);
      query.set('authName', offlineUsername);
      query.set('authUuid', offlineUuid);
      query.set('authAccess', 'offline-token');
    }

    const eventSource = new EventSource(`/api/minecraft/launch?${query.toString()}`);
    eventSourceRef.current = eventSource;
    
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

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };
  };

  useEffect(() => {
    const profileId = localStorage.getItem('launcher_active_profile_id') || '1';
    const minecraftPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';

    // Pre-launch Fabric Loader compatibility check
    fetch(`/api/minecraft/check-fabric-version?profileId=${encodeURIComponent(profileId)}&minecraftPath=${encodeURIComponent(minecraftPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.checkNeeded && data.isOutdated) {
          setFabricWarning(data);
          setStatus('fabric_warning');
        } else {
          startLaunch();
        }
      })
      .catch(() => {
        startLaunch();
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleUpdateFabricAndLaunch = async () => {
    if (!fabricWarning) {
      startLaunch();
      return;
    }

    setUpdatingFabric(true);
    const profileId = localStorage.getItem('launcher_active_profile_id') || '1';
    const targetVer = fabricWarning.requiredVersion || fabricWarning.latestVersion || '0.16.10';

    try {
      await fetch('/api/minecraft/update-fabric-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, loaderVersion: targetVer })
      });
    } catch (e) {
      console.error('Failed to update fabric version in profile:', e);
    }

    setUpdatingFabric(false);
    startLaunch();
  };

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
      ) : status === 'fabric_warning' && fabricWarning ? (
        <div className="bg-[#09090b] border border-amber-500/30 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-amber-500/5 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Требуется обновление Fabric Loader</h2>
                <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold mt-0.5">{profileName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                В вашей сборке установлены моды, которые требуют более свежую версию <strong className="text-purple-400 font-semibold">Fabric Loader ({fabricWarning.requiredVersion}+)</strong>.
              </p>

              {fabricWarning.modsRequiringUpdate && fabricWarning.modsRequiringUpdate.length > 0 && (
                <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 text-[11px] space-y-1 font-mono text-zinc-400">
                  <div className="text-amber-400 font-bold font-sans text-[10px] uppercase tracking-wider mb-1.5">Зависимые моды:</div>
                  {fabricWarning.modsRequiringUpdate.map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-zinc-300">
                      <span>• {m.modName}</span>
                      <span className="text-purple-400 text-[10px]">требует {m.rawConstraint}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60 text-zinc-400">
                <span>Версия в профиле: <code className="text-red-400 font-bold font-mono">{fabricWarning.currentVersion}</code></span>
                <span>Рекомендуемая: <code className="text-emerald-400 font-bold font-mono">{fabricWarning.requiredVersion}</code></span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 flex flex-col gap-2.5 bg-zinc-900/20 border-t border-zinc-800/40">
            <button
              onClick={handleUpdateFabricAndLaunch}
              disabled={updatingFabric}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 px-5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
            >
              {updatingFabric ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Обновление Fabric Loader...</span>
                </>
              ) : (
                <>
                  <span>Обновить до v{fabricWarning.requiredVersion} и запустить</span>
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>

            <button
              onClick={startLaunch}
              disabled={updatingFabric}
              className="w-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-widest transition-all"
            >
              Запустить без обновления (не рекомендуется)
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl relative overflow-hidden">
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
            <LogTerminal
              logs={logs}
              title="Лог запуска игры"
              subtitle="Minecraft Output"
              profileId={localStorage.getItem('launcher_active_profile_id') || '1'}
              minecraftPath={localStorage.getItem('launcher_minecraft_path') || './.minecraft'}
              heightClass="h-64 min-h-[220px]"
            />
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
