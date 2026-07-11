import React, { useState, useEffect } from 'react';
import { User, Cpu, HardDrive, RefreshCw } from 'lucide-react';

export default function SettingsTab({ userProfile, onLoginClick, onLogout }: { userProfile: {name: string, id: string, accessToken: string} | null, onLoginClick: () => void, onLogout: () => void }) {
  const [ram, setRam] = useState(4096);
  const [javaPath, setJavaPath] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    const savedAutoUpdate = localStorage.getItem('auto_update_mods');
    if (savedAutoUpdate === '1') {
      setAutoUpdate(true);
    }
  }, []);

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full relative">

      <div className="space-y-6 max-w-3xl">
        
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
            <div className="bg-zinc-900 border border-zinc-700/50 px-5 py-2.5 rounded-lg text-sm font-bold font-mono text-zinc-200 shadow-inner min-w-[100px] text-center">
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
                  <img src={`https://skinsystem.ely.by/avatars/${userProfile.name}`} alt="Skin" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = `https://minotar.net/helm/${userProfile.name}/100.png` }} />
                ) : (
                  <svg className="w-8 h-8 text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                )}
              </div>
              <div className="flex-1">
                {userProfile ? (
                  <>
                    <h4 className="text-sm font-bold text-zinc-100">{userProfile.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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
              <button onClick={onLogout} className="bg-zinc-800 text-white hover:bg-zinc-700 hover:text-red-400 px-6 py-2.5 rounded-lg text-xs font-bold transition-all border border-zinc-700">
                Выйти
              </button>
            ) : (
              <button onClick={onLoginClick} className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95">
                Войти через Ely.by
              </button>
            )}
          </div>
          
          <div className="mt-4 flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg relative z-10">
            <div className="text-emerald-400 mt-0.5">ℹ</div>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed">
              Ely.by позволяет бесплатно использовать свои скины и плащи на серверах. Все моды на скины (например, Fabric Tailor) будут работать корректно.
            </p>
          </div>
        </div>

        {/* Java Path */}
        <div className="rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-8 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60 text-amber-400">
              <HardDrive size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200 tracking-wide">Путь к Java (JAVA_HOME)</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Укажите путь к исполняемому файлу Java для запуска.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <input 
              type="text" 
              value={javaPath}
              onChange={(e) => setJavaPath(e.target.value)}
              placeholder="Автоматический поиск среды выполнения..." 
              className="flex-1 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-5 py-3 text-sm text-zinc-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-zinc-600 font-mono"
            />
            <button className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors">
              Обзор...
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 ml-2">Оставьте поле пустым, чтобы лаунчер автоматически нашел подходящую версию Java в реестре и системных переменных.</p>
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
                  <div className="text-red-400 mt-0.5 text-xs">⚠</div>
                  <p className="text-[10px] text-red-400/90 leading-relaxed font-medium">
                    Осторожно: Обновление модов может привести к несовместимости и поломке сборки. Включайте эту опцию, только если уверены в стабильности модов.
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

      </div>
    </div>
  );
}
