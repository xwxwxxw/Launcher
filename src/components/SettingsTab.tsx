import React, { useState, useEffect } from 'react';
import { User, Cpu, HardDrive, RefreshCw, Monitor, Sliders, Terminal, Folder, Shield, Sparkles } from 'lucide-react';
import PlayerHead2D from './PlayerHead2D';
import FileBrowserModal from './FileBrowserModal';

export default function SettingsTab({ 
  userProfile, 
  onLoginClick, 
  onLogout,
  ram,
  setRam,
  javaPath,
  setJavaPath
}: { 
  userProfile: {name: string, id: string, accessToken: string} | null, 
  onLoginClick: () => void, 
  onLogout: () => void,
  ram: number,
  setRam: (ram: number) => void,
  javaPath: string,
  setJavaPath: (path: string) => void
}) {
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<'minecraft' | 'java'>('minecraft');

  // Advanced Launcher Settings State
  const [minecraftPath, setMinecraftPath] = useState(() => localStorage.getItem('launcher_minecraft_path') || './.minecraft');
  const [resolutionWidth, setResolutionWidth] = useState(() => Number(localStorage.getItem('launcher_res_width')) || 1280);
  const [resolutionHeight, setResolutionHeight] = useState(() => Number(localStorage.getItem('launcher_res_height')) || 720);
  const [isFullscreen, setIsFullscreen] = useState(() => localStorage.getItem('launcher_fullscreen') === '1');
  const [launchBehavior, setLaunchBehavior] = useState(() => localStorage.getItem('launcher_behavior') || 'minimize');
  const [showConsole, setShowConsole] = useState(() => localStorage.getItem('launcher_show_console') === '1');
  const [jvmArgs, setJvmArgs] = useState(() => localStorage.getItem('launcher_jvm_args') || '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions');
  
  const [cacheCleared, setCacheCleared] = useState(false);
  const [settingsReset, setSettingsReset] = useState(false);

  useEffect(() => {
    const savedAutoUpdate = localStorage.getItem('auto_update_mods');
    if (savedAutoUpdate === '1') {
      setAutoUpdate(true);
    }
  }, []);

  const handleMinecraftPathChange = (val: string) => {
    setMinecraftPath(val);
    localStorage.setItem('launcher_minecraft_path', val);
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
            <Sliders className="text-blue-500" size={22} /> Настройки лаунчера
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Тонкая настройка параметров среды выполнения Java, путей, графики и учетной записи.</p>
        </div>

        {/* Memory Settings */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-blue-400">
              <Cpu size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Выделение памяти (RAM)</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Определяет объем ОЗУ, доступный для виртуальной машины Java.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 mb-4 bg-zinc-950/30 p-6 rounded-xl border border-zinc-800/40">
            <input 
              type="range" 
              min="512" 
              max="16384" 
              step="512" 
              value={ram}
              onChange={(e) => setRam(Number(e.target.value))}
              className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
            />
            <div className="bg-zinc-900 border border-zinc-700/50 px-5 py-2.5 rounded-lg text-sm font-bold font-mono text-zinc-200 shadow-inner min-w-[110px] text-center">
              {ram} MB
            </div>
          </div>
          <p className="text-[11px] text-amber-500/80 font-medium ml-2">Рекомендуется выделять не более 70% от общего объема системной памяти.</p>
        </div>

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
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-red-900/20 active:scale-95"
                  >
                    Да, выйти
                  </button>
                  <button 
                    onClick={() => setShowConfirmLogout(false)} 
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-zinc-700 active:scale-95"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowConfirmLogout(true)} 
                  className="bg-zinc-800 text-white hover:bg-zinc-700 hover:text-red-400 px-6 py-2.5 rounded-lg text-xs font-bold transition-all border border-zinc-700"
                >
                  Выйти
                </button>
              )
            ) : (
              <button onClick={onLoginClick} className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95">
                Войти через Ely.by
              </button>
            )}
          </div>
          
          <div className="mt-4 flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg relative z-10">
            <span className="text-emerald-400 mt-0.5 text-xs">ℹ</span>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed">
              Ely.by позволяет бесплатно использовать свои скины и плащи на серверах. Все моды на скины (например, Fabric Tailor) будут работать корректно.
            </p>
          </div>
        </div>

        {/* Directory Paths */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-amber-400">
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
                  className="flex-1 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-3 text-sm text-zinc-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-zinc-600 font-mono"
                />
                <button 
                  onClick={() => {
                    setBrowserTarget('minecraft');
                    setShowFileBrowser(true);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-6 py-3 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Обзор...
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
                  className="flex-1 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-3 text-sm text-zinc-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-zinc-600 font-mono"
                />
                <button 
                  onClick={() => {
                    setBrowserTarget('java');
                    setShowFileBrowser(true);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-6 py-3 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Обзор...
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 ml-2">Оставьте поле пустым, чтобы лаунчер автоматически нашел подходящую версию Java в реестре и системных переменных.</p>
            </div>
          </div>
        </div>

        {/* Graphics & Resolution */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-purple-400">
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
                  className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-0"
                />
                <span className="text-sm font-semibold text-zinc-200">Полноэкранный режим</span>
              </label>
              <p className="text-[11px] text-zinc-500">Запускать игру на весь экран, игнорируя настройки разрешения окна.</p>
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
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-cyan-400">
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
                <p className="text-[11px] text-zinc-500 mt-0.5">Что делать с окном лаунчера после успешного старта игры.</p>
              </div>
              <select 
                value={launchBehavior}
                onChange={(e) => handleLaunchBehaviorChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-200 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
              >
                <option value="close">Закрыть лаунчер</option>
                <option value="minimize">Свернуть лаунчер</option>
                <option value="keep_open">Оставить открытым</option>
              </select>
            </div>

            <div className="border-t border-zinc-800/60 pt-5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">Консоль отладки (Developer Console)</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Показывать системные логи и вывод игры в реальном времени.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={showConsole}
                  onChange={(e) => handleShowConsoleChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Custom JVM Arguments */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-red-400">
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
              className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-4 text-xs text-zinc-200 focus:border-red-500/50 outline-none transition-all font-mono leading-relaxed"
            />
            <p className="text-[11px] text-zinc-500 ml-2 leading-relaxed">Рекомендуемые аргументы для оптимизации G1 Garbage Collector и предотвращения микрофризов включены по умолчанию.</p>
          </div>
        </div>

        {/* Modrinth Auto Update */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex gap-4">
              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-emerald-400 h-fit">
                <RefreshCw size={24} strokeWidth={1.5} />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Автоматическое обновление (Modrinth)</h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Позволяет автоматически проверять и устанавливать новые версии модов перед запуском сборки.
                </p>
                <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                  <span className="text-red-400 mt-0.5 text-xs">⚠</span>
                  <p className="text-[10px] text-red-400/90 leading-relaxed font-medium">
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

        {/* Global Controls */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-amber-500">
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
              className={`flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
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
              className={`flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
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

      {showFileBrowser && (
        <FileBrowserModal 
          onClose={() => setShowFileBrowser(false)}
          title={browserTarget === 'minecraft' ? 'Выбор рабочей папки Minecraft' : 'Выбор папки Java (JAVA_HOME)'}
          initialPath={browserTarget === 'minecraft' ? minecraftPath : javaPath}
          onSelect={(selectedPath) => {
            if (browserTarget === 'minecraft') {
              handleMinecraftPathChange(selectedPath);
            } else {
              setJavaPath(selectedPath);
            }
          }}
        />
      )}
    </div>
  );
}
