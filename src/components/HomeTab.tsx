import React from 'react';
import { Package, ShieldAlert, Cpu, Layers, FolderTree, PlaySquare, Settings, ArrowRight, User } from 'lucide-react';
import PlayerSkin2D from './PlayerSkin2D';
import SkinViewer from './SkinViewer';

export default function HomeTab({ 
  onNavigate, 
  userProfile, 
  onLoginClick,
  modsCount,
  profilesCount,
  conflictsCount,
  ram,
  activeProfileName,
  activeProfile
}: { 
  onNavigate: (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts', section?: string) => void, 
  userProfile?: {name: string, id: string, accessToken: string} | null, 
  onLoginClick: () => void,
  modsCount: number,
  profilesCount: number,
  conflictsCount: number,
  ram: number,
  activeProfileName: string,
  activeProfile?: any
}) {
  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-row relative">
      {/* Main Content Area */}
      <div className="flex-1 px-10 py-12 overflow-y-auto scrollbar-none h-full relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-14">
          <StatCard icon={<Package className="text-blue-400" size={20} strokeWidth={2} />} title="Установлено модов" value={modsCount} trend="В выбранной сборке" onClick={() => onNavigate('mods')} />
          <StatCard icon={<Layers className="text-emerald-400" size={20} strokeWidth={2} />} title="Активные сборки" value={profilesCount} trend={activeProfileName} onClick={() => onNavigate('profiles')} />
          <StatCard icon={<ShieldAlert className={conflictsCount > 0 ? "text-amber-400" : "text-emerald-400"} size={20} strokeWidth={2} />} title="Проблемы и конфликты" value={conflictsCount} trend={conflictsCount > 0 ? "Обнаружены проблемы" : "Проблем не найдено"} onClick={() => onNavigate('conflicts')} />
          <StatCard icon={<Cpu className="text-indigo-400" size={20} strokeWidth={2} />} title="Выделено памяти" value={(ram >= 1024) ? (ram / 1024).toFixed(ram % 1024 === 0 ? 0 : 1) + " GB" : ram + " MB"} trend={ram < 3072 ? "Рекомендуется больше" : ram > 8192 ? "Слишком много" : "Оптимально"} onClick={() => onNavigate('settings', 'ram')} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Быстрые действия</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <QuickAction 
            title="Менеджер модов" 
            desc="Анализ зависимостей, фильтрация по типу и выявление конфликтов."
            onClick={() => onNavigate('mods')}
            icon={<FolderTree size={24} className="mb-4 text-blue-400" strokeWidth={1.5} />}
          />
          <QuickAction 
            title="Управление сборками" 
            desc="Создание профилей, выбор ядер и настройка аргументов JVM."
            onClick={() => onNavigate('profiles')}
            icon={<PlaySquare size={24} className="mb-4 text-emerald-400" strokeWidth={1.5} />}
          />
          <QuickAction 
            title="Настройки Ely.by" 
            desc="Интеграция аккаунта Ely.by для поддержки кастомных скинов и плащей."
            onClick={() => onNavigate('settings')}
            icon={<Settings size={24} className="mb-4 text-amber-400" strokeWidth={1.5} />}
          />
        </div>
      </div>

      {/* Right Sidebar for Skin Viewer */}
      <div className="w-80 h-full overflow-y-auto border-l border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md flex-shrink-0 flex flex-col items-center py-10 px-6 relative z-20 shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
        
        {userProfile ? (
          <div className="flex flex-col items-center group relative z-10 w-full">
            <div className="relative w-full flex justify-center items-center">
               <SkinViewer username={userProfile.name} uuid={userProfile.id} width={200} height={250} />
            </div>
            <div className="mt-4 flex flex-col items-center">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-3 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Ely.by Connected</span>
              <h3 className="text-xl font-bold tracking-wide text-zinc-100 mb-4">{userProfile.name}</h3>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).require) {
                    const { shell } = (window as any).require('electron');
                    shell.openExternal('https://ely.by');
                  } else {
                    window.open('https://ely.by', '_blank');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-[10px] font-bold uppercase tracking-widest transition-colors border border-blue-500/30"
              >
                Изменить скин (Ely.by)
              </button>
            </div>
            
          {activeProfile && activeProfile.stats && (
            <div className="mt-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 w-full">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Статистика профиля</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Сыграно времени</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    {Math.floor(activeProfile.stats.totalPlayTimeMs / 3600000)}ч {Math.floor((activeProfile.stats.totalPlayTimeMs % 3600000) / 60000)}м
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Последний запуск</span>
                  <span className="text-blue-400 font-medium">
                    {activeProfile.stats.lastLaunchTime > 0 ? new Date(activeProfile.stats.lastLaunchTime).toLocaleString() : 'Никогда'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Всего запусков</span>
                  <span className="text-purple-400 font-mono font-medium">{activeProfile.stats.launchCount}</span>
                </div>
              </div>
            </div>
          )}

          </div>
        ) : (
          <div className="flex flex-col items-center group relative z-10 w-full">
            <div className="relative w-full flex justify-center items-center opacity-40 grayscale group-hover:grayscale-[0.5] group-hover:opacity-70 transition-all duration-700">
               <SkinViewer username="Steve" width={200} height={250} />
            </div>
            <div className="mt-4 flex flex-col items-center w-full">
              <button 
                onClick={onLoginClick} 
                className="w-full bg-white text-black hover:bg-zinc-200 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5"
              >
                <User size={16} strokeWidth={2.5} /> Войти через Ely.by
              </button>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-4 text-center leading-relaxed">
                Войдите для синхронизации<br/>скинов и плащей
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, trend, onClick }: { icon: React.ReactNode, title: string, value: string | number, trend: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-6 flex flex-col backdrop-blur-md transition-all hover:bg-zinc-800/60 hover:border-zinc-700/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2.5 bg-zinc-950/50 rounded-xl border border-zinc-800/60 shadow-inner shadow-black/50">
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-3xl font-semibold tracking-tight text-zinc-100">{value}</div>
        <div className="text-[10px] text-zinc-500 mt-2 font-medium">{trend}</div>
      </div>
    </div>
  );
}

function QuickAction({ title, desc, onClick, icon }: { title: string, desc: string, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className="group flex flex-col items-start rounded-3xl border border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-800/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-left relative overflow-hidden"
    >
      <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={18} className="text-zinc-400" />
      </div>
      {icon}
      <h4 className="text-base font-bold mb-2 text-zinc-100 tracking-tight">{title}</h4>
      <p className="text-xs text-zinc-400/90 leading-relaxed font-medium max-w-[90%]">{desc}</p>
    </button>
  );
}
