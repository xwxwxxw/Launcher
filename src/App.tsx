import React, { useState, useEffect } from 'react';
import HomeTab from './components/HomeTab';
import ModsTab from './components/ModsTab';
import ProfilesTab from './components/ProfilesTab';
import SettingsTab from './components/SettingsTab';
import ConflictsTab from './components/ConflictsTab';
import ElyAuthModal from './components/ElyAuthModal';
import LaunchModal from './components/LaunchModal';
import UpdateModal from './components/UpdateModal';
import LauncherSplashScreen from './components/LauncherSplashScreen';
import SettingsModal from './components/SettingsModal';
import LogsTab from './components/LogsTab';
import ScreenshotsTab from './components/ScreenshotsTab';
import SkinViewer from './components/SkinViewer';
import PlayerHead2D from './components/PlayerHead2D';
import { Package, FolderTree, Settings, PlaySquare, User, ShieldAlert, ChevronDown, FileText, Image as ImageIcon, Settings2 } from 'lucide-react';
import { ModInfo, Profile } from './types';

export default function App() {
  const [activeTab, setActiveTabState] = useState<'home' | 'mods' | 'profiles' | 'settings' | 'conflicts'>(() => {
    return (localStorage.getItem('launcher_active_tab') as any) || 'home';
  });

  const setActiveTab = (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts') => {
    setActiveTabState(tab);
    localStorage.setItem('launcher_active_tab', tab);
  };
  const [userProfile, setUserProfile] = useState<{name: string, id: string, accessToken: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'installing' | 'running'>('idle');
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCheckingInstall, setIsCheckingInstall] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalGamePath, setGlobalGamePath] = useState(localStorage.getItem('launcher_minecraft_path') || './.minecraft');
  const [launcherVersion, setLauncherVersion] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).require) {
      const { app } = (window as any).require('electron').remote || {};
      if (app) setLauncherVersion(app.getVersion());
    }
  }, []);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [dismissedConflictIds, setDismissedConflictIds] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('launcher_dismissed_conflicts') || '[]')
  );

  const handleDismissConflict = (id: string) => {
    const updated = [...dismissedConflictIds, id];
    setDismissedConflictIds(updated);
    localStorage.setItem('launcher_dismissed_conflicts', JSON.stringify(updated));
  };

  // Lifted state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [loadingMods, setLoadingMods] = useState(true);

  const [ram, setRamState] = useState<number>(() => {
    const saved = localStorage.getItem('launcher_ram');
    return saved ? parseInt(saved, 10) : 4096;
  });
  const [javaPath, setJavaPathState] = useState<string>(() => {
    return localStorage.getItem('launcher_java_path') || '';
  });
  const [minecraftPath, setMinecraftPathState] = useState<string>(() => {
    return localStorage.getItem('launcher_minecraft_path') || './.minecraft';
  });

  const setRam = (val: number) => {
    setRamState(val);
    localStorage.setItem('launcher_ram', val.toString());
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { ram_mb: val });
    }
  };
  const setJavaPath = (val: string) => {
    setJavaPathState(val);
    localStorage.setItem('launcher_java_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { java_path: val });
    }
  };
  const setMinecraftPath = (val: string) => {
    setMinecraftPathState(val);
    localStorage.setItem('launcher_minecraft_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { minecraft_path: val });
    }
  };

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      const profs = Array.isArray(data) ? data : [];
      setProfiles(profs);
      
      const savedActiveId = localStorage.getItem('launcher_active_profile_id');
      if (savedActiveId && profs.some((p: any) => p.id === savedActiveId)) {
        setActiveProfileId(savedActiveId);
      } else if (profs.length > 0) {
        setActiveProfileId(profs[0].id);
        localStorage.setItem('launcher_active_profile_id', profs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingProfiles(false);
  };

  const fetchMods = async () => {
    if (!activeProfileId) return;
    setLoadingMods(true);
    try {
      const res = await fetch('/api/mods/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: '', profileId: activeProfileId })
      });
      const data = await res.json();
      setMods(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoadingMods(false);
  };

  const handleCreateProfile = async (newProf: any) => {
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProf)
      });
      const p = await res.json();
      setProfiles(prev => [...prev, p]);
      if (!activeProfileId) {
        handleSelectProfile(p.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (activeProfileId === id) {
        const remaining = profiles.filter(p => p.id !== id);
        if (remaining.length > 0) {
          handleSelectProfile(remaining[0].id);
        } else {
          setActiveProfileId('');
          localStorage.removeItem('launcher_active_profile_id');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem('launcher_active_profile_id', id);
    const found = profiles.find(p => p.id === id);
    if (found) {
      if (found.ram_mb) {
        setRamState(found.ram_mb);
        localStorage.setItem('launcher_ram', found.ram_mb.toString());
      }
      if (found.java_path !== undefined) {
        setJavaPathState(found.java_path);
        localStorage.setItem('launcher_java_path', found.java_path);
      } else {
        setJavaPathState('');
        localStorage.setItem('launcher_java_path', '');
      }
      if (found.minecraft_path !== undefined) {
        setMinecraftPathState(found.minecraft_path);
        localStorage.setItem('launcher_minecraft_path', found.minecraft_path);
      } else {
        setMinecraftPathState('./.minecraft');
        localStorage.setItem('launcher_minecraft_path', './.minecraft');
      }
    }
  };

  const handleDeleteMod = async (modId: string, filePath?: string) => {
    try {
      const res = await fetch('/api/mods/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId, profileId: activeProfileId, filePath })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMods();
      } else {
        alert('Ошибка при удалении мода: ' + (data.message || 'неизвестная ошибка'));
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения при удалении мода.');
    }
  };

  const handleUpdateProfile = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const updated = await res.json();
      setProfiles(prev => prev.map(p => p.id === id ? updated : p));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMod = async (modId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/mods/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId, profileId: activeProfileId, enabled })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMods();
      } else {
        alert('Ошибка при переключении мода: ' + (data.message || 'неизвестная ошибка'));
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения при переключении мода.');
    }
  };

  const getConflicts = () => {
    const list: any[] = [];
    
    const hasSodium = mods.some(m => 
      m.enabled && (m.mod_id?.toLowerCase() === 'sodium' || 
      m.display_name?.toLowerCase().includes('sodium'))
    );
    const hasOptifine = mods.some(m => 
      m.enabled && (m.mod_id?.toLowerCase() === 'optifine' || 
      m.display_name?.toLowerCase().includes('optifine'))
    );
    const hasFabricApi = mods.some(m => 
      m.enabled && (m.mod_id?.toLowerCase() === 'fabric-api' || 
      m.display_name?.toLowerCase().includes('fabric api') ||
      m.display_name?.toLowerCase().includes('fabric-api'))
    );

    if (hasSodium && hasOptifine) {
      list.push({
        id: 'conflict-optifine-sodium',
        type: 'conflict',
        title: 'Конфликт модов: OptiFine и Sodium',
        description: 'Мод OptiFine конфликтует с Sodium. Рекомендуется использовать только один оптимизатор для стабильной работы сборки.',
        severity: 'critical'
      });
    }

    if (hasSodium && !hasFabricApi) {
      list.push({
        id: 'missing-fabric-api',
        type: 'missing_dependency',
        title: 'Отсутствует зависимость: Fabric API',
        description: 'Для корректной работы Sodium в среде Fabric требуется установить официальный Fabric API.',
        severity: 'high'
      });
    }

    // Automatic check of ALL enabled mod dependencies
    mods.forEach(mod => {
      if (!mod.enabled) return;
      if (mod.depends && Array.isArray(mod.depends)) {
        mod.depends.forEach(depId => {
          const cleanDepId = depId.trim().toLowerCase();
          // Skip known platform modules / system APIs
          if (['minecraft', 'java', 'fabricloader', 'fabric', 'quiltloader', 'yarn', 'loom', 'fabric-api-base'].includes(cleanDepId)) {
            return;
          }
          
          // Check if installed & enabled
          const isInstalled = mods.some(m => 
            m.enabled && (
              m.mod_id?.toLowerCase() === cleanDepId || 
              m.name?.toLowerCase() === cleanDepId ||
              m.display_name?.toLowerCase().includes(cleanDepId)
            )
          );

          if (!isInstalled) {
            list.push({
              id: `missing-dep-${mod.mod_id}-${cleanDepId}`,
              type: 'missing_dependency_auto',
              title: `Отсутствует зависимость для ${mod.display_name || mod.name}`,
              description: `Для корректной работы мода "${mod.display_name || mod.name}" требуется установить отсутствующий мод "${depId}".`,
              severity: 'high',
              payload: {
                parentMod: mod.display_name || mod.name,
                dependencyId: cleanDepId,
                dependencyName: depId
              }
            });
          }
        });
      }
    });

    if (mods.length > 0 && mods.length < 3) {
      list.push({
        id: 'warning-few-mods',
        type: 'warning',
        title: 'Рекомендация: Добавьте моды оптимизации',
        description: 'Ваша сборка содержит очень мало модов. Рекомендуем установить Iris Shaders для поддержки шейдеров.',
        severity: 'low'
      });
    }

    // Filter out dismissed ones
    return list.filter(item => !dismissedConflictIds.includes(item.id));
  };

  const conflicts = getConflicts();

  const handleResolveConflict = async (actionType: string, payload?: any) => {
    if (actionType === 'install_dep') {
      try {
        alert('Установка Fabric API с Modrinth... Пожалуйста, подождите.');
        const res = await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: 'P7dR8mSH', profileId: activeProfileId }) // Fabric API
        });
        const data = await res.json();
        if (data.success) {
          alert('Fabric API успешно установлен!');
          await fetchMods();
        } else {
          alert('Ошибка установки Fabric API: ' + (data.message || 'неизвестная ошибка'));
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка при соединении с сервером для установки Fabric API.');
      }
    } else if (actionType === 'install_auto_dep' && payload) {
      try {
        alert(`Попытка установки ${payload.dependencyName} с Modrinth...`);
        const res = await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: payload.dependencyId, versionId: 'latest', folderPath: '', profileId: activeProfileId })
        });
        const data = await res.json();
        if (data.success) {
          alert(`Зависимость ${payload.dependencyName} успешно установлена!`);
          await fetchMods();
        } else {
          alert(`Не удалось автоматически установить "${payload.dependencyName}". Попробуйте найти его в Modrinth вручную.`);
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка при автоматической установке зависимости.');
      }
    } else if (actionType === 'remove_optifine') {
      try {
        const optifineMod = mods.find(m => 
          m.mod_id?.toLowerCase() === 'optifine' || 
          m.display_name?.toLowerCase().includes('optifine')
        );
        const modIdToDelete = optifineMod?.mod_id || 'optifine';
        await handleDeleteMod(modIdToDelete);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      fetchMods();
    }
  }, [activeProfileId]);

  useEffect(() => {
    const prof = profiles.find(p => p.id === activeProfileId) || profiles[0];
    if (prof) {
      setIsCheckingInstall(true);
      fetch(`/api/minecraft/check-installed?minecraftPath=${encodeURIComponent(minecraftPath)}&version=${prof.game_version}&loader=${prof.mod_loader}`)
        .then(res => res.json())
        .then(data => {
          setIsInstalled(data.installed);
          setIsCheckingInstall(false);
        })
        .catch(() => {
          setIsInstalled(false);
          setIsCheckingInstall(false);
        });
    }
  }, [activeProfileId, profiles, minecraftPath]);

  useEffect(() => {
    // 1. Initial load of active session
    const saved = localStorage.getItem('ely_session');
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. LocalStorage fallback check function
    const checkPendingSession = () => {
      const pending = localStorage.getItem('ely_session_pending');
      if (pending) {
        try {
          const profile = JSON.parse(pending);
          setUserProfile(profile);
          localStorage.setItem('ely_session', JSON.stringify(profile));
          setShowAuthModal(false);
          
          // Clear pending items to prevent infinite triggers
          localStorage.removeItem('ely_session_pending');
          localStorage.removeItem('ely_session_pending_time');
        } catch (e) {
          console.error('Error parsing pending session:', e);
        }
      }
    };

    // Check immediately on mount
    checkPendingSession();

    // Poll for game status periodically
    const checkGameStatus = async () => {
      try {
        const res = await fetch('/api/minecraft/status');
        if (res.ok) {
          const data = await res.json();
          setGameStatus(data.status);
        }
      } catch (e) {}
    };
    
    // Check initially and then every 3 seconds
    checkGameStatus();
    const gameStatusInterval = setInterval(checkGameStatus, 3000);

    // 3. Listen to storage changes (fired when other windows/tabs modify localStorage)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'ely_session_pending' && e.newValue) {
        checkPendingSession();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 4. Listen to window focus (triggers immediately when the user returns to this tab)
    const handleFocus = () => {
      checkPendingSession();
    };
    window.addEventListener('focus', handleFocus);

    // 5. Short Interval check as a foolproof final fallback
    const interval = setInterval(checkPendingSession, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
      clearInterval(gameStatusInterval);
    };
  }, []);

  const handleLoginSuccess = (profile: any) => {
    setUserProfile(profile);
    localStorage.setItem('ely_session', JSON.stringify(profile));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('ely_session');
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('save-auth', null).catch(() => {});
    }
  };

  const activeProfile: any = profiles.find(p => p.id === activeProfileId) || profiles[0] || {
    id: '1',
    name: 'Vanilla 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Vanilla',
    mod_loader_version: '0.15.7',
    description: 'Чистая сборка без модов.',
    ram_mb: ram,
    mod_path: './profiles/1/.minecraft/mods',
    created_at: Date.now(),
    is_active: true
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
            badge={conflicts.length}
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
              <PlayerHead2D username={userProfile.name} uuid={userProfile.id} className="w-full h-full rounded-full" />
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
            <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md shadow-inner">
              v{launcherVersion || '0.0.4'}
            </span>
          </div>
          <div className="flex items-center space-x-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-red-500 transition-colors"></div>
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-amber-500 transition-colors"></div>
            <div className="h-3 w-3 rounded-full bg-zinc-700 hover:bg-emerald-500 transition-colors"></div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex flex-1 flex-row overflow-hidden relative z-10">
          {activeTab === 'home' && (
            <HomeTab 
              onNavigate={setActiveTab} 
              userProfile={userProfile} 
              onLoginClick={() => setShowAuthModal(true)} 
              modsCount={mods.length}
              profilesCount={profiles.length}
              conflictsCount={conflicts.length}
              ram={ram}
              activeProfileName={activeProfile.name}
              activeProfile={activeProfile}
            />
          )}
          {activeTab === 'mods' && (
            <ModsTab 
              mods={mods.filter(m => m.profile_id === activeProfileId)}
              loading={loadingMods}
              onScan={fetchMods}
              onDelete={handleDeleteMod}
              onRefresh={fetchMods}
              onToggleMod={handleToggleMod}
              activeProfileId={activeProfileId}
              activeProfile={activeProfile}
            />
          )}
          {activeTab === 'profiles' && (
            <ProfilesTab 
              profiles={profiles}
              loading={loadingProfiles}
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onCreateProfile={handleCreateProfile}
              onDeleteProfile={handleDeleteProfile}
              onUpdateProfile={handleUpdateProfile}
              mods={mods}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'conflicts' && (
            <ConflictsTab 
              conflicts={conflicts}
              onResolveConflict={handleResolveConflict}
              onDismissConflict={handleDismissConflict}
            />
          )}
          {(activeTab as any) === 'logs' && (
            <LogsTab activeProfileId={activeProfileId} />
          )}
          {(activeTab as any) === 'screenshots' && (
            <ScreenshotsTab activeProfileId={activeProfileId} globalGamePath={globalGamePath} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab 
              userProfile={userProfile} 
              onLoginClick={() => setShowAuthModal(true)} 
              onLogout={handleLogout} 
              ram={ram}
              setRam={setRam}
              javaPath={javaPath}
              setJavaPath={setJavaPath}
              minecraftPath={minecraftPath}
              setMinecraftPath={setMinecraftPath}
            />
          )}
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
              <span>Сборка <span className="text-zinc-300">{activeProfile.name}</span></span>
              <span className="text-zinc-700">•</span>
              <span>Версия <span className="text-zinc-300">{activeProfile.game_version}</span></span>
              <span className="text-zinc-700">•</span>
              <span>Ядро <span className="text-zinc-300">{activeProfile.mod_loader}</span></span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right flex flex-col justify-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Статус запуска</p>
              <p className={`text-xs font-semibold ${gameStatus === 'running' ? 'text-blue-400' : (gameStatus === 'installing' ? 'text-amber-400' : (isInstalled ? 'text-emerald-400' : 'text-amber-400'))}`}>
                {gameStatus === 'running' ? 'В игре' : (gameStatus === 'installing' ? 'Запуск / Установка...' : (isInstalled ? 'Готов к игре' : 'Требуется установка'))}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <select 
                  value={activeProfile.id}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-200 text-sm font-semibold rounded-xl pl-4 pr-10 h-12 outline-none appearance-none cursor-pointer transition-all shadow-inner backdrop-blur-md min-w-[160px] truncate"
                  title="Выбор сборки"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <ChevronDown size={18} />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (gameStatus === 'running') {
                    // Try to kill
                    fetch('/api/minecraft/kill', { method: 'POST' }).then(() => setGameStatus('idle'));
                  } else {
                    setShowLaunchModal(true);
                  }
                }} 
                disabled={gameStatus === 'installing'}
                className="relative group overflow-hidden flex h-12 w-48 items-center justify-center rounded-xl bg-zinc-100 text-[#09090b] text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-50 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative flex items-center gap-2">
                  <PlaySquare size={16} fill="currentColor" /> {gameStatus === 'running' ? 'Остановить' : (isCheckingInstall ? '...' : (isInstalled ? 'Играть' : 'Установить'))}
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>
      
      {showLaunchModal && (
        <LaunchModal 
          profileName={activeProfile.name}
          userProfile={userProfile}
          onGameStatusChange={(s) => setGameStatus(s)}
          onClose={() => setShowLaunchModal(false)}
        />
      )}
      
      <UpdateModal />
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          gamePath={globalGamePath}
          setGamePath={setGlobalGamePath}
        />
      )}

      {showSplashScreen && (
        <LauncherSplashScreen 
          loadingProfiles={loadingProfiles}
          loadingMods={loadingMods}
          onComplete={() => setShowSplashScreen(false)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-3 rounded-xl transition-all duration-200 group relative ${
        active 
          ? 'text-zinc-100 bg-zinc-800/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20'
      }`}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-4 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white border-2 border-[#121214] animate-pulse">
          {badge}
        </span>
      )}
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`mt-2 text-[9px] uppercase tracking-widest font-bold transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </button>
  );
}

