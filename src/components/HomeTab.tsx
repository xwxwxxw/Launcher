import React from 'react';
import { Package, ShieldAlert, Cpu, Layers, FolderTree, PlaySquare, Settings, ArrowRight, User } from 'lucide-react';

export default function HomeTab({ onNavigate, userProfile, onLoginClick }: { onNavigate: (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts') => void, userProfile?: {name: string, id: string, accessToken: string} | null, onLoginClick: () => void }) {
  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-row relative">
      {/* Main Content Area */}
      <div className="flex-1 px-10 py-12 overflow-y-auto scrollbar-none h-full relative z-10">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">MC Manager Pro</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Профессиональный инструмент для управления сборками Minecraft.
            Анализируйте зависимости, настраивайте параметры запуска и используйте продвинутые инструменты профилирования.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-14">
          <StatCard icon={<Package className="text-blue-400" size={20} strokeWidth={2} />} title="Установлено модов" value="142" trend="+3 за неделю" onClick={() => onNavigate('mods')} />
          <StatCard icon={<Layers className="text-emerald-400" size={20} strokeWidth={2} />} title="Активные сборки" value="4" trend="Vanilla 1.20.1" onClick={() => onNavigate('profiles')} />
          <StatCard icon={<ShieldAlert className="text-amber-400" size={20} strokeWidth={2} />} title="Проблемы и конфликты" value="3" trend="Обнаружены проблемы" onClick={() => onNavigate('conflicts')} />
          <StatCard icon={<Cpu className="text-indigo-400" size={20} strokeWidth={2} />} title="Выделено памяти" value="8 GB" trend="Оптимально" onClick={() => onNavigate('settings')} />
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
      <div className="w-80 h-full border-l border-zinc-800/60 bg-zinc-900/10 flex-shrink-0 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
        
        {userProfile ? (
          <div className="flex flex-col items-center group relative z-10">
            <div className="relative w-40 h-80 flex justify-center items-center">
               <img src={`https://minotar.net/armor/body/${userProfile.name}/200.png`} className="w-auto h-full object-contain filter drop-shadow-[0_15px_25px_rgba(59,130,246,0.3)] group-hover:scale-[1.02] transition-transform duration-500" alt="Player Skin" onError={(e) => { e.currentTarget.src = 'https://minotar.net/armor/body/Steve/200.png' }} />
               <div className="absolute -bottom-2 w-32 h-4 bg-blue-900/30 blur-[15px] rounded-[100%] scale-x-150"></div>
               <div className="absolute -bottom-2 w-16 h-2 bg-blue-500/40 blur-[8px] rounded-[100%] scale-x-150"></div>
            </div>
            <div className="mt-8 flex flex-col items-center">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-3 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Ely.by Connected</span>
              <h3 className="text-xl font-bold tracking-wide text-zinc-100">{userProfile.name}</h3>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center group relative z-10 w-full">
            <div className="relative w-40 h-80 flex justify-center items-center opacity-40 grayscale group-hover:grayscale-[0.5] group-hover:opacity-70 transition-all duration-700">
               <img src={`https://minotar.net/armor/body/Steve/200.png`} className="w-auto h-full object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]" alt="Player Skin Placeholder" />
               <div className="absolute -bottom-2 w-32 h-4 bg-black/60 blur-[15px] rounded-[100%] scale-x-150"></div>
               <div className="absolute -bottom-2 w-16 h-2 bg-black/40 blur-[8px] rounded-[100%] scale-x-150"></div>
            </div>
            <div className="mt-8 flex flex-col items-center w-full">
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
      className={`relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5 flex flex-col backdrop-blur-sm transition-all hover:bg-zinc-800/40 hover:border-zinc-700/80 group ${onClick ? 'cursor-pointer' : ''}`}
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
      className="group flex flex-col items-start rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:shadow-xl hover:shadow-black/20 text-left relative overflow-hidden"
    >
      <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={18} className="text-zinc-400" />
      </div>
      {icon}
      <h4 className="text-base font-semibold mb-2 text-zinc-200">{title}</h4>
      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[90%]">{desc}</p>
    </button>
  );
}
