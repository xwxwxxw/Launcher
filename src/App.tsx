import React, { useState, useEffect } from 'react';
import HomeTab from './components/HomeTab';
import ModsTab from './components/ModsTab';
import ProfilesTab from './components/ProfilesTab';
import SettingsTab from './components/SettingsTab';
import ConflictsTab from './components/ConflictsTab';
import ElyAuthModal from './components/ElyAuthModal';
import LaunchModal from './components/LaunchModal';
import { Package, FolderTree, Settings, PlaySquare, User, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'mods' | 'profiles' | 'settings' | 'conflicts'>('home');
  const [userProfile, setUserProfile] = useState<{name: string, id: string, accessToken: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ely_session');
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleLoginSuccess = (profile: any) => {
    setUserProfile(profile);
    localStorage.setItem('ely_session', JSON.stringify(profile));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('ely_session');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#09090b] font-sans text-zinc-100 select-none selection:bg-blue-500/30 relative">
      {/* Subtle ambient glows for glassmorphism backdrop */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      
      {showAuthModal && (
        <ElyAuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleLoginSuccess} 
        />
      )}
      
      {/* Sidebar Navigation */}
      <nav className="flex w-[88px] flex-col items-center border-r border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md py-8 flex-shrink-0 z-20 shadow-2xl">
        <div className="mb-12">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Package className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col space-y-6 w-full px-4">
          <TabButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<Package size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />} 
            label="Главная" 
          />
          <TabButton 
            active={activeTab === 'mods'} 
            onClick={() => setActiveTab('mods')} 
            icon={<FolderTree size={22} strokeWidth={activeTab === 'mods' ? 2.5 : 2} />} 
            label="Моды" 
          />
          <TabButton 
            active={activeTab === 'profiles'} 
            onClick={() => setActiveTab('profiles')} 
            icon={<PlaySquare size={22} strokeWidth={activeTab === 'profiles' ? 2.5 : 2} />} 
            label="Сборки" 
          />
          <TabButton 
            active={activeTab === 'conflicts'} 
            onClick={() => setActiveTab('conflicts')} 
            icon={<ShieldAlert size={22} strokeWidth={activeTab === 'conflicts' ? 2.5 : 2} />} 
            label="Проблемы" 
          />
          <TabButton 
            active={activeTab === 'settings'} 

            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />} 
            label="Настройки" 
          />
        </div>
        <div className="mt-auto mb-2 cursor-pointer group" onClick={() => userProfile ? setActiveTab('settings') : setShowAuthModal(true)}>
          <div className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-500/10 overflow-hidden transition-all shadow-inner">
            {userProfile ? (
              <img src={`https://minotar.net/helm/${userProfile.name}/100.png`} alt="User" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://minotar.net/helm/Steve/100.png' }} />
            ) : (
              <User className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
            )}
          </div>
        </div>
      </nav>

      {/* Main Window */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#09090b] relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full"></div>

        {/* Custom Title Bar */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800/60 px-8 flex-shrink-0 z-10 backdrop-blur-md bg-[#09090b]/80">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold tracking-tight text-white">Layle Launcher</span>
            <div className="h-1 w-1 rounded-full bg-zinc-700 mx-2"></div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-red-500 transition-colors"></div>
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-amber-500 transition-colors"></div>
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-emerald-500 transition-colors"></div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex flex-1 flex-row overflow-hidden relative z-10">
          {activeTab === 'home' && <HomeTab onNavigate={setActiveTab} userProfile={userProfile} onLoginClick={() => setShowAuthModal(true)} />}
          {activeTab === 'mods' && <ModsTab />}
          {activeTab === 'profiles' && <ProfilesTab />}
          {activeTab === 'conflicts' && <ConflictsTab />}
          {activeTab === 'settings' && <SettingsTab userProfile={userProfile} onLoginClick={() => setShowAuthModal(true)} onLogout={handleLogout} />}
        </main>

        {/* Footer / Launcher Controls */}
        <footer className="flex h-[88px] items-center justify-between border-t border-zinc-800/60 bg-[#09090b]/95 backdrop-blur-md px-8 flex-shrink-0 z-20">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-zinc-100">{userProfile ? userProfile.name : 'Гость'}</span>
              {userProfile ? (
                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Ely.by Account</span>
              ) : (
                <span className="text-[9px] font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full uppercase tracking-widest cursor-pointer hover:bg-zinc-700 transition-colors" onClick={() => setShowAuthModal(true)}>Войти</span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              <span>Сборка <span className="text-zinc-300">Vanilla 1.20.1</span></span>
              <span className="text-zinc-700">•</span>
              <span>Ядро <span className="text-zinc-300">Fabric 0.15.7</span></span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right flex flex-col justify-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Статус запуска</p>
              <p className="text-xs font-semibold text-emerald-400">Готов к игре</p>
            </div>
            <button onClick={() => setShowLaunchModal(true)} className="relative group overflow-hidden flex h-12 w-48 items-center justify-center rounded-xl bg-zinc-100 text-[#09090b] text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-50 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center gap-2">
                <PlaySquare size={16} fill="currentColor" /> Играть
              </span>
            </button>
          </div>
        </footer>
      </div>
      
      {showLaunchModal && (
        <LaunchModal 
          profileName="Vanilla 1.20.1"
          onClose={() => setShowLaunchModal(false)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'text-zinc-100 bg-zinc-800/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20'
      }`}
    >
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`mt-2 text-[9px] uppercase tracking-widest font-bold transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </button>
  );
}

