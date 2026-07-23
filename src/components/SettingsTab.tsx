import { useState, useEffect, useRef } from 'react';
import { User, Cpu, HardDrive, RefreshCw, Monitor, Sliders, Terminal, Folder, FolderOpen, Shield, Sparkles } from 'lucide-react';
import PlayerHead2D from './PlayerHead2D';
import { openFolderInExplorer } from '../utils/explorer';
import CustomSelect from './CustomSelect';

export default function SettingsTab({ 
  userProfile, 
  onLoginClick, 
  onLogout,
  ram,
  setRam,
  javaPath,
  setJavaPath,
  minecraftPath,
  setMinecraftPath,
  onCheckForUpdates,
  currentVersion,
  initialSubTab = 'account',
  highlightRam = false,
  checkDependencies = true,
  setCheckDependencies = () => {},
  checkGdriveUpdates = true,
  setCheckGdriveUpdates = () => {},
  gdriveAutoSync = false,
  setGdriveAutoSync = () => {},
  offlineUsername = 'LaylePlayer',
  setOfflineUsername = () => {}
}: { 
  userProfile: {name: string, id: string, accessToken: string} | null, 
  onLoginClick: () => void, 
  onLogout: () => void,
  ram: number,
  setRam: (ram: number) => void,
  javaPath: string,
  setJavaPath: (path: string) => void,
  minecraftPath: string,
  setMinecraftPath: (path: string) => void,
  onCheckForUpdates: (silent: boolean) => Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }>,
  currentVersion: string,
  initialSubTab?: 'account' | 'game' | 'graphics' | 'system',
  highlightRam?: boolean,
  checkDependencies?: boolean,
  setCheckDependencies?: (val: boolean) => void,
  checkGdriveUpdates?: boolean,
  setCheckGdriveUpdates?: (val: boolean) => void,
  gdriveAutoSync?: boolean,
  setGdriveAutoSync?: (val: boolean) => void,
  offlineUsername?: string,
  setOfflineUsername?: (val: string) => void
}) {
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const minecraftInputRef = useRef<HTMLInputElement>(null);
  const javaInputRef = useRef<HTMLInputElement>(null);

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'error'>('idle');
  const [latestVer, setLatestVer] = useState('');
  const [updateError, setUpdateError] = useState('');

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const res = await onCheckForUpdates(false);
      if (res.success) {
        if (res.updateAvailable) {
          setUpdateStatus('available');
          setLatestVer(res.version || '');
        } else {
          setUpdateStatus('latest');
        }
      } else {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Неизвестная ошибка');
      }
    } catch (e: any) {
      setUpdateStatus('error');
      setUpdateError(e.message || 'Ошибка');
    }
  };

  const handleMinecraftBrowse = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        const selected = await ipcRenderer.invoke('select-directory', minecraftPath);
        if (selected) {
          setMinecraftPath(selected);
        }
        return;
      } catch (e) {
        console.error('Failed to open Electron directory dialog:', e);
      }
    }
    minecraftInputRef.current?.click();
  };

  const handleJavaBrowse = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        const selected = await ipcRenderer.invoke('select-directory', javaPath);
        if (selected) {
          setJavaPath(selected);
        }
        return;
      } catch (e) {
        console.error('Failed to open Electron directory dialog:', e);
      }
    }
    javaInputRef.current?.click();
  };

  const [isFindingJava, setIsFindingJava] = useState(false);
  const handleFindJava = async () => {
    setIsFindingJava(true);
    try {
      const res = await fetch('/api/java/find');
      const data = await res.json();
      if (data.success && data.paths && data.paths.length > 0) {
        setJavaPath(data.paths[0]);
      } else {
        alert('Не удалось автоматически найти Java. Пожалуйста, укажите путь вручную (выберите java.exe).');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при автоматическом поиске Java.');
    } finally {
      setIsFindingJava(false);
    }
  };

  const handleMinecraftFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath || '';
      const folderName = relativePath.split('/')[0] || '.minecraft';
      const cleanName = folderName.startsWith('.') ? folderName : `.${folderName}`;
      const simulatedPath = `C:\\Users\\MinecraftPlayer\\AppData\\Roaming\\${cleanName}`;
      setMinecraftPath(simulatedPath);
    }
  };

  const handleJavaFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath || '';
      const folderName = relativePath.split('/')[0] || 'jdk-17';
      const simulatedPath = `C:\\Program Files\\Java\\${folderName}`;
      setJavaPath(simulatedPath);
    }
  };

  // Advanced Launcher Settings State
  const [resolutionWidth, setResolutionWidth] = useState(() => Number(localStorage.getItem('launcher_res_width')) || 1280);
  const [resolutionHeight, setResolutionHeight] = useState(() => Number(localStorage.getItem('launcher_res_height')) || 720);
  const [isFullscreen, setIsFullscreen] = useState(() => localStorage.getItem('launcher_fullscreen') === '1');
  const [launchBehavior, setLaunchBehavior] = useState(() => localStorage.getItem('launcher_behavior') || 'minimize');
  const [showConsole, setShowConsole] = useState(() => localStorage.getItem('launcher_show_console') === '1');
  const [jvmArgs, setJvmArgs] = useState(() => localStorage.getItem('launcher_jvm_args') || '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions');
  const [cacheCleared, setCacheCleared] = useState(false);
  const [settingsReset, setSettingsReset] = useState(false);
  const [subTab, setSubTab] = useState<'account' | 'game' | 'graphics' | 'system'>('account');

  // Auto RAM selection state and effects
  const [systemRamSpecs, setSystemRamSpecs] = useState<{ total: number; free: number; suggested: number } | null>(null);
  const [isAutoRam, setIsAutoRam] = useState(() => {
    const saved = localStorage.getItem('launcher_auto_ram');
    return saved !== '0'; // default to true (Auto selection enabled by default)
  });

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    fetch('/api/system/ram')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSystemRamSpecs({
            total: data.totalMb,
            free: data.freeMb,
            suggested: data.suggestedMb
          });
        }
      })
      .catch(err => console.error('Failed to fetch RAM specs:', err));
  }, []);

  useEffect(() => {
    if (isAutoRam && systemRamSpecs && systemRamSpecs.suggested) {
      setRam(systemRamSpecs.suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoRam, systemRamSpecs]);

  useEffect(() => {
    const savedAutoUpdate = localStorage.getItem('auto_update_mods');
    if (savedAutoUpdate === '1') {
      setAutoUpdate(true);
    }
  }, []);

  const handleMinecraftPathChange = (val: string) => {
    setMinecraftPath(val);
  };
  const handleResWidthChange = (val: number) => {
    setResolutionWidth(val);
    localStorage.setItem('launcher_res_width', String(val));
  };
  const handleResHeightChange = (val: number) => {
    setResolutionHeight(val);
    localStorage.setItem('launcher_res_height', String(val));
  };
  const handleFullscreenChange = (val: boolean) => {
    setIsFullscreen(val);
    localStorage.setItem('launcher_fullscreen', val ? '1' : '0');
  };
  const handleLaunchBehaviorChange = (val: string) => {
    setLaunchBehavior(val);
    localStorage.setItem('launcher_behavior', val);
  };
  const handleShowConsoleChange = (val: boolean) => {
    setShowConsole(val);
    localStorage.setItem('launcher_show_console', val ? '1' : '0');
  };
  const handleJvmArgsChange = (val: string) => {
    setJvmArgs(val);
    localStorage.setItem('launcher_jvm_args', val);
  };

  const handleClearCache = () => {
    localStorage.removeItem('simulated_file_system');
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleResetSettings = () => {
    localStorage.removeItem('launcher_minecraft_path');
    localStorage.removeItem('launcher_res_width');
    localStorage.removeItem('launcher_res_height');
    localStorage.removeItem('launcher_fullscreen');
    localStorage.removeItem('launcher_behavior');
    localStorage.removeItem('launcher_show_console');
    localStorage.removeItem('launcher_jvm_args');
    localStorage.removeItem('auto_update_mods');
    
    setMinecraftPath('./.minecraft');
    setResolutionWidth(1280);
    setResolutionHeight(720);
    setIsFullscreen(false);
    setLaunchBehavior('minimize');
    setShowConsole(false);
    setJvmArgs('-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions');
    setAutoUpdate(false);
    
    setRam(4096);
    setJavaPath('');
    
    setSettingsReset(true);
    setTimeout(() => setSettingsReset(false), 2000);
  };

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full relative">
      <div className="space-y-6 max-w-3xl pb-16">
        
        {/* Header Title */}
        <div className="mb-4">
          <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <Sliders className="text-purple-400" size={22} /> Настройки лаунчера
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Тонкая настройка параметров среды выполнения Java, путей, графики и учетной записи.</p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl mb-8">
          <button
            onClick={() => setSubTab('account')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 relative border cursor-pointer ${
              subTab === 'account'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20 border-transparent'
            }`}
          >
            <User size={15} />
            Аккаунт
          </button>
          
          <button
            onClick={() => setSubTab('game')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 relative border cursor-pointer ${
              subTab === 'game'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20 border-transparent'
            }`}
          >
            <Cpu size={15} />
            Память и Пути
          </button>

          <button
            onClick={() => setSubTab('graphics')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 relative border cursor-pointer ${
              subTab === 'graphics'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20 border-transparent'
            }`}
          >
            <Monitor size={15} />
            Экран и Запуск
          </button>

          <button
            onClick={() => setSubTab('system')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 relative border cursor-pointer ${
              subTab === 'system'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20 border-transparent'
            }`}
          >
            <Sliders size={15} />
            Система
          </button>
        </div>

        {/* Categories Content */}
        
        {subTab === 'account' && (
          <div className="space-y-6 animate-fade-in">
            {/* Auth Settings - ELY.BY */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <User size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Авторизация Ely.by</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Альтернативная система авторизации с поддержкой кастомных скинов и плащей.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-zinc-950/50 rounded-xl border border-zinc-800/40 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
                    {userProfile ? (
                      <PlayerHead2D username={userProfile.name} uuid={userProfile.id} className="w-full h-full rounded-full scale-[1.3]" />
                    ) : (
                      <svg className="w-8 h-8 text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    {userProfile ? (
                      <>
                        <h4 className="text-sm font-bold text-zinc-100">{userProfile.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Подключено (Ely.by)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-zinc-300">Аккаунт не подключен</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Требуется вход</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {userProfile ? (
                  showConfirmLogout ? (
                    <div className="flex items-center gap-2 animate-fade-in relative z-20">
                      <span className="text-[11px] text-red-400 font-bold mr-1">Выйти из аккаунта?</span>
                      <button 
                        onClick={() => {
                          onLogout();
                          setShowConfirmLogout(false);
                        }} 
                        className="bg-red-650 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-red-900/20 active:scale-95 cursor-pointer"
                      >
                        Да, выйти
                      </button>
                      <button 
                        onClick={() => setShowConfirmLogout(false)} 
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-zinc-700 active:scale-95 cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowConfirmLogout(true)} 
                      className="bg-zinc-800 text-white hover:bg-zinc-700 hover:text-red-400 px-6 py-2.5 rounded-lg text-xs font-bold transition-all border border-zinc-700 cursor-pointer"
                    >
                      Выйти
                    </button>
                  )
                ) : (
                  <button onClick={onLoginClick} className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 cursor-pointer">
                    Войти через Ely.by
                  </button>
                )}
              </div>
              
              <div className="mt-4 flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg relative z-10">
                <span className="text-emerald-400 mt-0.5 text-xs">ℹ</span>
                <p className="text-[11px] text-emerald-400/80 leading-relaxed font-sans">
                  Ely.by позволяет бесплатно использовать свои скины и плащи на серверах. Все моды на скины (например, Fabric Tailor) будут работать корректно.
                </p>
              </div>
            </div>

            {!userProfile && (
              <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                    <Sliders size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Автономный режим (Игра без интернета)</h3>
                    <p className="text-[11px] text-zinc-500 mt-1">Настройте никнейм для игры в оффлайн-режиме, если у вас отсутствует подключение к интернету или нет аккаунта.</p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10 max-w-md">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Локальный никнейм</label>
                    <input 
                      type="text" 
                      value={offlineUsername}
                      onChange={(e) => setOfflineUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="LaylePlayer"
                      maxLength={16}
                      className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-4 py-3 text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all text-white font-medium shadow-inner"
                    />
                    <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                      Разрешены только латинские буквы, цифры и символ подчеркивания. Максимум 16 символов.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {subTab === 'game' && (
          <div className="space-y-6 animate-fade-in">
            {/* Memory Settings */}
            <div className={`rounded-3xl border p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-1000 ${
              highlightRam 
                ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-2 ring-purple-500/20' 
                : 'border-zinc-800/40 bg-zinc-900/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                    <Cpu size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Выделение памяти (RAM)</h3>
                    <p className="text-[11px] text-zinc-500 mt-1">Определяет объем ОЗУ, доступный для виртуальной машины Java.</p>
                  </div>
                </div>

                {/* Auto selection button */}
                <button 
                  onClick={() => {
                    const nextVal = !isAutoRam;
                    setIsAutoRam(nextVal);
                    localStorage.setItem('launcher_auto_ram', nextVal ? '1' : '0');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 select-none cursor-pointer ${
                    isAutoRam 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                      : 'bg-zinc-950/40 text-zinc-500 border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700/60'
                  }`}
                >
                  <Sparkles size={12} className={isAutoRam ? "animate-pulse text-purple-400" : ""} />
                  {isAutoRam ? "Авто выбор: Вкл" : "Авто выбор: Выкл"}
                </button>
              </div>
              
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-6 bg-zinc-950/30 p-6 rounded-xl border border-zinc-800/40">
                  <input 
                    type="range" 
                    min="1024" 
                    max={systemRamSpecs ? Math.max(8192, systemRamSpecs.total) : "16384"} 
                    step="512" 
                    value={ram}
                    onChange={(e) => {
                      setRam(Number(e.target.value));
                      setIsAutoRam(false);
                      localStorage.setItem('launcher_auto_ram', '0');
                    }}
                    className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="bg-zinc-900 border border-zinc-700/50 px-5 py-2.5 rounded-lg text-sm font-bold font-mono text-zinc-200 shadow-inner min-w-[110px] text-center">
                    {ram} MB
                  </div>
                </div>

                {systemRamSpecs && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/20 p-4 rounded-xl border border-zinc-800/20 text-xs text-zinc-400">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold">Всего в ПК</span>
                      <span className="font-mono text-zinc-300 font-medium">{(systemRamSpecs.total / 1024).toFixed(1)} GB ({systemRamSpecs.total} MB)</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-zinc-900 pt-2 md:pt-0 md:pl-4">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold">Доступно / Свободно</span>
                      <span className="font-mono text-emerald-400 font-medium">{(systemRamSpecs.free / 1024).toFixed(1)} GB ({systemRamSpecs.free} MB)</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-zinc-900 pt-2 md:pt-0 md:pl-4">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold">Оптимально (Выбрано)</span>
                      <span className="font-mono text-purple-400 font-medium">{(systemRamSpecs.suggested / 1024).toFixed(1)} GB ({systemRamSpecs.suggested} MB)</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-2">
                <span className="text-amber-500/80 text-xs">⚠️</span>
                <p className="text-[11px] text-amber-500/80 font-medium">
                  {isAutoRam 
                    ? "Память оптимизирована под вашу конфигурацию ПК (с учетом ОЗУ под Windows и фоновые программы)." 
                    : "Рекомендуется выделять не более 70% от общего объема системной памяти для предотвращения зависаний."}
                </p>
              </div>
            </div>

            {/* Directory Paths */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Folder size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Папки и Директории</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Настройки корневой рабочей папки Minecraft и загрузчика модов.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Рабочая папка игры (.minecraft)</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={minecraftPath}
                      onChange={(e) => handleMinecraftPathChange(e.target.value)}
                      placeholder="Например, C:\Users\user\AppData\Roaming\.minecraft"
                      className="flex-1 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-3 text-sm text-zinc-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600 font-mono"
                    />
                    <input 
                      type="file"
                      ref={minecraftInputRef}
                      style={{ display: 'none' }}
                      {...{ webkitdirectory: "", directory: "" }}
                      onChange={handleMinecraftFolderSelect}
                    />
                    <button 
                      type="button"
                      onClick={handleMinecraftBrowse}
                      className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-6 py-3 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Обзор...
                    </button>
                    <button 
                      type="button"
                      onClick={() => openFolderInExplorer(minecraftPath)}
                      className="bg-zinc-900 hover:bg-zinc-850 hover:text-white px-4 py-3 border border-zinc-800/80 rounded-xl text-zinc-400 transition-colors flex items-center justify-center cursor-pointer"
                      title="Открыть в проводнике Windows"
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Путь к Java (JAVA_HOME)</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={javaPath}
                      onChange={(e) => setJavaPath(e.target.value)}
                      placeholder="Автоматический поиск среды выполнения..." 
                      className="flex-1 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-3 text-sm text-zinc-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600 font-mono"
                    />
                    <input 
                      type="file"
                      ref={javaInputRef}
                      style={{ display: 'none' }}
                      {...{ webkitdirectory: "", directory: "" }}
                      onChange={handleJavaFolderSelect}
                    />
                    <button 
                      type="button"
                      onClick={handleFindJava}
                      disabled={isFindingJava}
                      className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 hover:text-purple-400 px-4 py-3 border border-purple-600/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      title="Автоматический поиск Java на ПК"
                    >
                      {isFindingJava ? 'Поиск...' : 'Найти Java'}
                    </button>
                    <button 
                      type="button"
                      onClick={handleJavaBrowse}
                      className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-6 py-3 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Обзор...
                    </button>
                    {javaPath && (
                      <button 
                        type="button"
                        onClick={() => openFolderInExplorer(javaPath)}
                        className="bg-zinc-900 hover:bg-zinc-850 hover:text-white px-4 py-3 border border-zinc-800/80 rounded-xl text-zinc-400 transition-colors flex items-center justify-center cursor-pointer"
                        title="Открыть в проводнике Windows"
                      >
                        <FolderOpen size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2 ml-2 font-sans">Оставьте поле пустым, чтобы лаунчер автоматически нашел подходящую версию Java в реестре и системных переменных.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'graphics' && (
          <div className="space-y-6 animate-fade-in">
            {/* Graphics & Resolution */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Monitor size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Разрешение и Режим экрана</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Определяет размеры окна Minecraft при запуске.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-950/30 border border-zinc-800/40 rounded-xl">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isFullscreen}
                      onChange={(e) => handleFullscreenChange(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-purple-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-zinc-200">Полноэкранный режим</span>
                  </label>
                  <p className="text-[11px] text-zinc-500 font-sans">Запускать игру на весь экран, игнорируя настройки разрешения окна.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500">Разрешение окна (Ширина x Высота)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={resolutionWidth}
                      disabled={isFullscreen}
                      onChange={(e) => handleResWidthChange(Number(e.target.value))}
                      className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:border-purple-500/50 outline-none transition-all font-mono disabled:opacity-40"
                    />
                    <span className="text-zinc-500 font-mono">x</span>
                    <input 
                      type="number" 
                      value={resolutionHeight}
                      disabled={isFullscreen}
                      onChange={(e) => handleResHeightChange(Number(e.target.value))}
                      className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:border-purple-500/50 outline-none transition-all font-mono disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launcher Behavior & Console */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Terminal size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Поведение при запуске</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Определяет поведение лаунчера после запуска игры.</p>
                </div>
              </div>
              
              <div className="space-y-5 bg-zinc-950/30 p-6 border border-zinc-800/40 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">Действие лаунчера</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-sans">Что делать с окном лаунчера после успешного старта игры.</p>
                  </div>
                  <CustomSelect 
                    value={launchBehavior}
                    onChange={handleLaunchBehaviorChange}
                    options={[
                      { value: 'close', label: 'Закрыть лаунчер' },
                      { value: 'minimize', label: 'Свернуть лаунчер' },
                      { value: 'keep_open', label: 'Оставить открытым' }
                    ]}
                    className="w-48"
                  />
                </div>

                <div className="border-t border-zinc-800/60 pt-5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">Консоль отладки (Developer Console)</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-sans">Показывать системные логи и вывод игры в реальном времени.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={showConsole}
                      onChange={(e) => handleShowConsoleChange(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'system' && (
          <div className="space-y-6 animate-fade-in">
            {/* Custom JVM Arguments */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Sliders size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Параметры запуска Java (JVM Arguments)</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Дополнительные аргументы командной строки для тонкой оптимизации Java Virtual Machine.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <textarea 
                  value={jvmArgs}
                  onChange={(e) => handleJvmArgsChange(e.target.value)}
                  placeholder="Дополнительные аргументы запуска..." 
                  rows={3}
                  className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-4 text-xs text-zinc-200 focus:border-purple-500/50 outline-none transition-all font-mono leading-relaxed"
                />
                <p className="text-[11px] text-zinc-500 ml-2 leading-relaxed font-sans">Рекомендуемые аргументы для оптимизации G1 Garbage Collector и предотвращения микрофризов включены по умолчанию.</p>
              </div>
            </div>

            {/* Modrinth Auto Update */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 h-fit">
                    <RefreshCw size={24} strokeWidth={1.5} />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Автоматическое обновление (Modrinth)</h3>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                      Позволяет автоматически проверять и устанавливать новые версии модов перед запуском сборки.
                    </p>
                    <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                      <span className="text-red-400 mt-0.5 text-xs">⚠</span>
                      <p className="text-[10px] text-red-400/90 leading-relaxed font-medium font-sans">
                        Осторожно: Автоматическое обновление может нарушить целостность файлов или вызвать конфликты версий.
                      </p>
                    </div>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={autoUpdate}
                    onChange={(e) => {
                      setAutoUpdate(e.target.checked);
                      localStorage.setItem('auto_update_mods', e.target.checked ? '1' : '0');
                    }}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Dependency Check Toggle */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 h-fit">
                    <Shield size={24} strokeWidth={1.5} />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Проверка зависимостей модов</h3>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                      Автоматически сканировать включенные моды на наличие отсутствующих необходимых библиотек и вспомогательных API. Отключите, если сборка стабильна, но лаунчер отображает ложные предупреждения.
                    </p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={checkDependencies}
                    onChange={(e) => setCheckDependencies(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Google Drive Update checking */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden space-y-6">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 h-fit">
                    <HardDrive size={24} strokeWidth={1.5} />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Проверять обновления сборки на Google Диске</h3>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                      Автоматически проверять наличие обновлений для GDSync профиля на Google Диске при запуске лаунчера.
                    </p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={checkGdriveUpdates}
                    onChange={(e) => setCheckGdriveUpdates(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {checkGdriveUpdates && (
                <div className="pt-6 border-t border-zinc-800/40 flex items-start justify-between relative z-10">
                  <div className="flex gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 h-fit">
                      <RefreshCw size={24} strokeWidth={1.5} />
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Автоматическая синхронизация сборки</h3>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans">
                        Автоматически запускавать синхронизацию при обнаружении обновлений на Google Диске при запуске лаунчера. Если отключено, лаунчер только покажет уведомление.
                      </p>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer mt-2">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={gdriveAutoSync}
                      onChange={(e) => setGdriveAutoSync(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Launcher Updates */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Sparkles size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Обновление лаунчера</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Проверка наличия новых версий Layle Launcher.</p>
                </div>
              </div>
              
              <div className="bg-zinc-950/30 p-6 border border-zinc-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-300 font-semibold font-sans">Текущая версия: <span className="font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800 rounded">v{currentVersion}</span></p>
                  {updateStatus === 'latest' && <p className="text-[11px] text-emerald-400 mt-1.5 font-medium font-sans">✓ Установлена последняя версия!</p>}
                  {updateStatus === 'checking' && <p className="text-[11px] text-zinc-400 mt-1.5 animate-pulse font-sans">Поиск обновлений...</p>}
                  {updateStatus === 'available' && <p className="text-[11px] text-emerald-400 mt-1.5 font-semibold font-sans">★ Доступно обновление v{latestVer}! Оно запустится автоматически в углу.</p>}
                  {updateStatus === 'error' && <p className="text-[11px] text-red-400 mt-1.5 font-medium font-sans">⚠ Ошибка: {updateError}</p>}
                </div>
                <button
                  onClick={handleCheckUpdate}
                  disabled={updateStatus === 'checking'}
                  className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white px-6 h-11 border border-zinc-700/80 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updateStatus === 'checking' ? 'Проверка...' : 'Проверить обновления'}
                </button>
              </div>
            </div>

            {/* Global Controls */}
            <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Shield size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Сброс и Очистка кэша</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">Сервисные операции для восстановления стабильности лаунчера.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <button 
                  onClick={handleClearCache}
                  disabled={cacheCleared}
                  className={`flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer ${
                    cacheCleared 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {cacheCleared ? '✓ Кэш успешно очищен' : 'Очистить кэш модов'}
                </button>
                <button 
                  onClick={handleResetSettings}
                  disabled={settingsReset}
                  className={`flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer ${
                    settingsReset 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                  }`}
                >
                  {settingsReset ? '✓ Настройки сброшены' : 'Сбросить все настройки'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
