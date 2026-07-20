import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ExternalLink, HardDrive, Minus, Maximize2 } from 'lucide-react';
import { Profile } from '../types';
import { googleSignIn, getAccessToken } from '../lib/googleAuth';

interface SyncModalProps {
  onClose: (didSyncSucceed?: boolean) => void;
  profileId: string;
  profile: Profile;
}

export default function SyncModal({ onClose, profileId, profile }: SyncModalProps) {
  const [logs, setLogs] = useState<{ msg: string; time: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [status, setStatus] = useState<'auth_required' | 'syncing' | 'success' | 'error'>('auth_required');
  const [errorMsg, setErrorMsg] = useState('');
  const [tagName, setTagName] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Check if already authenticated on mount/profile load
  useEffect(() => {
    fetch(`/api/gdrive/auth-status?profileId=${profileId}`)
      .then(res => res.json())
      .then(data => {
        if (data.hasServerToken) {
          setGdriveToken('server_token');
          setStatus('syncing');
        } else {
          getAccessToken().then(tok => {
            if (tok) {
              setGdriveToken(tok);
              setStatus('syncing');
            } else {
              setStatus('auth_required');
            }
          });
        }
      })
      .catch(() => {
        getAccessToken().then(tok => {
          if (tok) {
            setGdriveToken(tok);
            setStatus('syncing');
          } else {
            setStatus('auth_required');
          }
        });
      });
  }, [profileId, profile]);

  useEffect(() => {
    if (!gdriveToken) {
      return;
    }

    const minecraftPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';

    const query = new URLSearchParams({
      profileId,
      minecraftPath,
      syncSource: 'gdrive',
      gdriveFolderId: profile.gdriveFolderId || '',
      gdriveToken: gdriveToken || ''
    });

    setStatus('syncing');
    const eventSource = new EventSource(`/api/sync-build?${query.toString()}`);
    const timeNow = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    eventSource.addEventListener('status', (e: any) => {
      const data = JSON.parse(e.data);
      setLogs(prev => [...prev, { msg: data.message, time: timeNow() }]);
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
    });

    eventSource.addEventListener('success', (e: any) => {
      const data = JSON.parse(e.data);
      setLogs(prev => [...prev, { msg: data.message, time: timeNow() }]);
      setProgress(100);
      setTagName(data.tag || 'latest');
      setStatus('success');
      eventSource.close();
    });

    eventSource.addEventListener('error', (e: any) => {
      const data = JSON.parse(e.data);
      setLogs(prev => [...prev, { msg: `КРИТИЧЕСКАЯ ОШИБКА: ${data.message}`, time: timeNow() }]);
      setErrorMsg(data.message);
      setStatus('error');
      eventSource.close();
    });

    eventSource.onerror = () => {
      setLogs(prev => [...prev, { msg: 'КРИТИЧЕСКАЯ ОШИБКА: Ошибка подключения к серверу синхронизации.', time: timeNow() }]);
      setErrorMsg('Прервано соединение с сервером.');
      setStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [profileId, gdriveToken, profile]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const result = await googleSignIn();
      if (result?.accessToken) {
        setGdriveToken(result.accessToken);
        setStatus('syncing');
      } else {
        throw new Error('Failed to obtain Google token.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Ошибка авторизации Google');
      setStatus('error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-cyan-400">
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
                status === 'error' ? 'bg-red-500' : (status === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400')
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
            <RefreshCw className={`text-cyan-400 ${status === 'syncing' ? 'animate-spin' : ''}`} size={20} />
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
        <div className="p-8 flex flex-col items-center border-b border-zinc-900/50 bg-gradient-to-b from-cyan-950/5 to-transparent">
          {status === 'auth_required' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-5 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <HardDrive size={32} />
              </div>
              <h4 className="text-zinc-100 font-bold text-center mb-2">Требуется авторизация Google</h4>
              <p className="text-xs text-zinc-400 text-center max-w-md mb-6 leading-relaxed">
                Для скачивания модов с вашего Google Диска необходимо войти в аккаунт Google и предоставить доступ к чтению файлов.
              </p>
              
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-3 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98] disabled:opacity-50 cursor-pointer mb-6"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="animate-spin text-black" size={16} />
                    Подключение...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0 text-black" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Войти через Google
                  </>
                )}
              </button>

              <div className="max-w-md w-full bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 text-left animate-fade-in">
                <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-blue-400 mb-1">Вы администратор или создатель сборки?</h5>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Чтобы вашим игрокам <strong>не требовалось никуда входить</strong>, просто укажите созданный вами <strong>Google API Ключ</strong> (API Key) одним из способов:
                </p>
                <ul className="list-disc pl-4 text-[10px] text-zinc-500 mt-2 space-y-1">
                  <li>В лаунчере: вкладка <strong>«Сборки»</strong> &rarr; кнопка <strong>«Редактировать»</strong> на вашей сборке &rarr; поле <strong>«API Ключ или Токен доступа»</strong>.</li>
                  <li>Или пропишите его на сервере в файле <strong>.env</strong> в переменную <code className="text-zinc-300 font-mono">GDRIVE_API_KEY="ВАШ_КЛЮЧ"</code>.</li>
                </ul>
                <p className="text-[10px] text-amber-400/80 mt-2 leading-relaxed font-medium">
                  Важно: папка на Google Диске должна быть открыта для чтения всем по ссылке («Доступен всем, у кого есть ссылка»).
                </p>
              </div>
            </div>
          )}

          {status === 'syncing' && (
            <>
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <Loader2 className="animate-spin text-cyan-400 absolute w-full h-full" size={48} strokeWidth={1.5} />
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
              <p className="text-xs text-zinc-400 text-center max-w-md mb-1">
                Все моды и настройки сборки были успешно обновлены.
              </p>
              <p className="text-[10px] text-zinc-500 text-center">
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
              
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Повторить авторизацию
              </button>
            </>
          )}

          {/* Progress Bar (only show if not waiting for auth) */}
          {status !== 'auth_required' && (
            <div className="w-full mt-8">
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/20 shadow-inner">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    status === 'error' ? 'bg-red-500' : (status === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400')
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                <span>ПРОГРЕСС</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Terminal Output Console */}
        <div className="flex-1 bg-zinc-950 p-6 flex flex-col min-h-[160px] max-h-[250px] overflow-hidden border-b border-zinc-900">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Лог операции обновления</span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-600 font-mono">UTC Terminal</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none font-mono text-[11px] text-zinc-400 space-y-1.5 p-3 rounded-2xl bg-[#09090b] border border-zinc-900">
            {status === 'auth_required' ? (
              <div className="text-zinc-600 italic">Ожидание авторизации пользователя...</div>
            ) : logs.length === 0 ? (
              <div className="text-zinc-600 italic">Инициализация логов обновления...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2.5 leading-relaxed">
                  <span className="text-zinc-600 flex-shrink-0 select-none">[{log.time}]</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
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
