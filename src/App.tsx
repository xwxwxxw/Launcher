import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import PlayerHead2D from './components/PlayerHead2D';
import { FolderTree, Settings, PlaySquare, User, ShieldAlert, ChevronDown, Image as ImageIcon, Minus, Square, X, Gamepad2, Home, DownloadCloud, RefreshCw, Star } from 'lucide-react';
import { ModInfo, Profile } from './types';
import ModrinthModal from './components/ModrinthModal';
import ModrinthTab from './components/ModrinthTab';
import NotificationToast, { ToastMessage } from './components/NotificationToast';
import SyncModal from './components/SyncModal';
import { getAccessToken } from './lib/googleAuth';

export default function App() {
  const [activeTab, setActiveTabState] = useState<'home' | 'mods' | 'profiles' | 'settings' | 'conflicts' | 'builder'>(() => {
    return (localStorage.getItem('launcher_active_tab') as any) || 'home';
  });

  const [settingsSubTab, setSettingsSubTab] = useState<'account' | 'game' | 'graphics' | 'system'>('account');
  const [highlightRam, setHighlightRam] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const setActiveTab = (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts' | 'builder') => {
    setActiveTabState(tab);
    localStorage.setItem('launcher_active_tab', tab);
    setShowModrinthModal(false); // Close mod installation modal on tab switch!
  };

  const [userProfile, setUserProfile] = useState<{name: string, id: string, accessToken: string} | null>(() => {
    try {
      const saved = localStorage.getItem('ely_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showModrinthModal, setShowModrinthModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'installing' | 'running'>('idle');
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCheckingInstall, setIsCheckingInstall] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalGamePath, setGlobalGamePath] = useState(localStorage.getItem('launcher_minecraft_path') || './.minecraft');
  const [launcherVersion, setLauncherVersion] = useState((import.meta as any).env.VITE_APP_VERSION || '0.0.11');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showCustomToast = useCallback((message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    let type: 'success' | 'error' | 'info' = 'info';
    const lower = message.toLowerCase();
    if (lower.includes('успеш') || lower.includes('заверш') || lower.includes('готов') || lower.includes('установлен') || lower.includes('скачан')) {
      type = 'success';
    } else if (lower.includes('ошибк') || lower.includes('не удалось') || lower.includes('сбой') || lower.includes('недостаточно') || lower.includes('внимание') || lower.includes('не найден') || lower.includes('предназначен') || lower.includes('попытка') || lower.includes('установка')) {
      type = 'info';
      if (lower.includes('ошибк') || lower.includes('не удалось') || lower.includes('сбой') || lower.includes('не найден')) {
        type = 'error';
      }
    }

    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    window.alert = (message: string) => {
      showCustomToast(message);
    };
  }, [showCustomToast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        ipcRenderer.invoke('get-app-version')
          .then((v: string) => {
            if (v) setLauncherVersion(v);
          })
          .catch((err: any) => {
            console.error('Failed to get app version via IPC:', err);
            const { app } = (window as any).electron.remote || {};
            if (app) Promise.resolve(app.getVersion()).then(v => setLauncherVersion(v));
          });

        // Load auth from auth.json via get-auth
        ipcRenderer.invoke('get-auth')
          .then((authData: any) => {
            if (authData) {
              setUserProfile(authData);
              const originalSetItem = (localStorage as any).originalSetItem || localStorage.setItem.bind(localStorage);
              originalSetItem('ely_session', JSON.stringify(authData));
            }
          })
          .catch((err: any) => console.error('Failed to load auth via IPC:', err));

        // Listen for session-restore from Electron main process
        ipcRenderer.on('session-restore', (e: any, authData: any) => {
          if (authData) {
            setUserProfile(authData);
            const originalSetItem = (localStorage as any).originalSetItem || localStorage.setItem.bind(localStorage);
            originalSetItem('ely_session', JSON.stringify(authData));
          }
        });

        // Load all persistent settings from Electron's settings.json
        ipcRenderer.invoke('get-settings')
          .then((settings: any) => {
            if (settings) {
              const originalSetItem = (localStorage as any).originalSetItem || localStorage.setItem.bind(localStorage);
              Object.keys(settings).forEach(key => {
                if (key === 'ely_session') {
                  // Only restore settings session if it's valid and non-empty
                  try {
                    const parsed = JSON.parse(settings[key]);
                    if (parsed && parsed.name) {
                      originalSetItem(key, settings[key]);
                    }
                  } catch (e) {}
                  return;
                }
                originalSetItem(key, settings[key]);
              });
              
              // Trigger state updates
              if (settings.launcher_active_tab) {
                setActiveTab(settings.launcher_active_tab);
              }
              if (settings.launcher_minecraft_path) {
                setGlobalGamePath(settings.launcher_minecraft_path);
                setMinecraftPathState(settings.launcher_minecraft_path);
              }
              if (settings.launcher_ram) {
                setRamState(Number(settings.launcher_ram));
              }
              if (settings.launcher_java_path) {
                setJavaPathState(settings.launcher_java_path);
              }
              if (settings.launcher_active_profile_id) {
                setActiveProfileId(settings.launcher_active_profile_id);
              }
              if (settings.ely_session) {
                try {
                  const parsed = JSON.parse(settings.ely_session);
                  if (parsed && parsed.name) {
                    setUserProfile(parsed);
                  }
                } catch (e) {}
              }
              
              if (settings.launcher_minimize_tray !== undefined) {
                ipcRenderer.invoke('set-minimize-to-tray', settings.launcher_minimize_tray === '1');
              }
              if (settings.launcher_autostart !== undefined) {
                ipcRenderer.invoke('set-autostart', settings.launcher_autostart === '1');
              }
            }
          })
          .catch((err: any) => console.error('Failed to load initial settings via IPC:', err));
      } catch (e) {
        console.error('Failed to setup version fetch:', e);
      }
    }
  }, []);
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.ipcRenderer.send('window-minimize');
    }
  };

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.ipcRenderer.send('window-maximize');
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  };

  const [updateInfo, setUpdateInfo] = useState<{ version: string; notes: string; assets: any[] } | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const checkForUpdates = async (silent = true) => {
    try {
      const repo = (import.meta as any).env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher';
      const res = await fetch(`/api/updates/check?repo=${encodeURIComponent(repo)}`);
      if (!res.ok) {
        throw new Error(`Ошибка сервера обновлений: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      const latestVersion = data.latestVersion;
      const currentVersion = launcherVersion || '0.0.6';
      
      const isNewerVersion = (latest: string, current: string) => {
        const lParts = latest.replace(/[^0-9.]/g, '').split('.').map(Number);
        const cParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);
        for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
          const l = lParts[i] || 0;
          const c = cParts[i] || 0;
          if (l > c) return true;
          if (l < c) return false;
        }
        return false;
      };

      if (latestVersion !== currentVersion && isNewerVersion(latestVersion, currentVersion)) {
        setUpdateInfo({
          version: latestVersion,
          notes: data.releaseNotes,
          assets: data.assets
        });
        setShowUpdateModal(true);
        return { success: true, updateAvailable: true, version: latestVersion };
      } else {
        return { success: true, updateAvailable: false };
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      // Fallback to electron check if server is unreachable
      if (typeof window !== 'undefined' && (window as any).electron) {
        try {
          const { ipcRenderer } = (window as any).electron;
          const repo = (import.meta as any).env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher';
          const data = await ipcRenderer.invoke('check-updates', repo);
          if (data && data.updateAvailable) {
            setUpdateInfo({
              version: data.latestVersion,
              notes: data.releaseNotes,
              assets: data.assets
            });
            setShowUpdateModal(true);
            return { success: true, updateAvailable: true, version: data.latestVersion };
          }
        } catch (e: any) {
          console.error('Electron update check fallback failed:', e);
        }
      }
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    // Perform update check
    checkForUpdates(true);
  }, []);

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
  const [modsTabProfileId, setModsTabProfileId] = useState<string>('global');

  useEffect(() => {
    if (activeProfileId) {
      setModsTabProfileId(activeProfileId);
    }
  }, [activeProfileId]);
  
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

  const setRam = useCallback((val: number) => {
    setRamState(val);
    localStorage.setItem('launcher_ram', val.toString());
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { ram_mb: val });
    }
  }, [activeProfileId]);
  const setJavaPath = useCallback((val: string) => {
    setJavaPathState(val);
    localStorage.setItem('launcher_java_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { java_path: val });
    }
  }, [activeProfileId]);
  const setMinecraftPath = useCallback((val: string) => {
    setMinecraftPathState(val);
    localStorage.setItem('launcher_minecraft_path', val);
    if (activeProfileId) {
      handleUpdateProfile(activeProfileId, { minecraft_path: val });
    }
  }, [activeProfileId]);

  const [gdriveUpdateAvailable, setGdriveUpdateAvailable] = useState(false);
  const [checkingGDrive, setCheckingGDrive] = useState(false);
  const [gdriveAuthRequired, setGdriveAuthRequired] = useState(false);

  const checkGDriveUpdates = async (profileToCheck: any) => {
    if (!profileToCheck || (profileToCheck.syncSource !== 'gdrive' && profileToCheck.id !== 'GDSync')) {
      setGdriveUpdateAvailable(false);
      setGdriveAuthRequired(false);
      return;
    }

    setCheckingGDrive(true);
    setGdriveAuthRequired(false);
    try {
      const token = await getAccessToken();
      const mcPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';
      const folderId = profileToCheck.gdriveFolderId || '';
      
      const res = await fetch(`/api/gdrive/check-updates?folderId=${encodeURIComponent(folderId)}&token=${encodeURIComponent(token || '')}&profileId=${encodeURIComponent(profileToCheck.id)}&minecraftPath=${encodeURIComponent(mcPath)}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.updateAvailable) {
          setGdriveUpdateAvailable(true);
          
          const autoSync = localStorage.getItem('launcher_gdrive_auto_sync') !== 'false';
          if (autoSync) {
            setShowSyncModal(true);
          }
        } else {
          setGdriveUpdateAvailable(false);
        }
      } else {
        if (res.status === 401 || res.status === 403) {
          // Check if server-side auth is configured
          const statusRes = await fetch(`/api/gdrive/auth-status?profileId=${encodeURIComponent(profileToCheck.id)}`);
          const statusData = await statusRes.json().catch(() => ({}));
          if (!statusData.hasServerToken) {
            setGdriveAuthRequired(true);
          }
        }
      }
    } catch (e) {
      console.error('Error checking GDrive updates:', e);
    } finally {
      setCheckingGDrive(false);
    }
  };

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      const profs = Array.isArray(data) ? data : [];
      
      const sortedProfs = [...profs].sort((a, b) => {
        const aFav = a.is_favorite ? 1 : 0;
        const bFav = b.is_favorite ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return (b.created_at || 0) - (a.created_at || 0);
      });
      setProfiles(sortedProfs);
      
      const savedActiveId = localStorage.getItem('launcher_active_profile_id');
      if (savedActiveId && sortedProfs.some((p: any) => p.id === savedActiveId)) {
        setActiveProfileId(savedActiveId);
      } else {
        const syncProfile = sortedProfs.find((p: any) => p.id === 'GDSync');
        if (syncProfile) {
          setActiveProfileId(syncProfile.id);
          localStorage.setItem('launcher_active_profile_id', syncProfile.id);
        } else if (sortedProfs.length > 0) {
          setActiveProfileId(sortedProfs[0].id);
          localStorage.setItem('launcher_active_profile_id', sortedProfs[0].id);
        }
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
      await fetch(`/api/profiles/${id}?globalPath=${encodeURIComponent(globalGamePath)}`, { method: 'DELETE' });
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
      setProfiles(prev => {
        const mapped = prev.map(p => p.id === id ? updated : p);
        return [...mapped].sort((a, b) => {
          const aFav = a.is_favorite ? 1 : 0;
          const bFav = b.is_favorite ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          return (b.created_at || 0) - (a.created_at || 0);
        });
      });
    } catch (e) {
      console.error(e);
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

  const activeGdriveFolderId = activeProfile?.gdriveFolderId;
  const isGdriveSync = activeProfile?.syncSource === 'gdrive' || activeProfile?.id === 'GDSync';
  
  useEffect(() => {
    if (activeProfile && (activeProfile.syncSource === 'gdrive' || activeProfile.id === 'GDSync')) {
      checkGDriveUpdates(activeProfile);
      const interval = setInterval(() => checkGDriveUpdates(activeProfile), 300000);
      return () => clearInterval(interval);
    } else {
      setGdriveUpdateAvailable(false);
      setGdriveAuthRequired(false);
    }
  }, [activeProfileId, activeGdriveFolderId, isGdriveSync]);

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

    // 1. Loader Mismatch Check
    mods.forEach(m => {
      if (!m.enabled) return;
      if (activeProfile.mod_loader === 'Fabric' && m.mod_loader === 'forge') {
        list.push({
          id: `loader-mismatch-${m.mod_id}`,
          type: 'conflict',
          title: `Несовместимый загрузчик: ${m.display_name || m.name}`,
          description: `Мод "${m.display_name || m.name}" разработан для Forge, однако ваша текущая сборка использует Fabric. Этот мод не запустится и приведет к ошибке игры.`,
          severity: 'critical'
        });
      } else if (activeProfile.mod_loader === 'Forge' && (m.mod_loader === 'fabric' || m.mod_loader === 'quilt')) {
        list.push({
          id: `loader-mismatch-${m.mod_id}`,
          type: 'conflict',
          title: `Несовместимый загрузчик: ${m.display_name || m.name}`,
          description: `Мод "${m.display_name || m.name}" разработан для Fabric/Quilt, однако ваша текущая сборка использует Forge. Этот мод не запустится и приведет к ошибке игры.`,
          severity: 'critical'
        });
      }
    });

    // 3. Duplicate Minimaps Check
    const minimapMods = mods.filter(m => 
      m.enabled && (
        (m.mod_id?.toLowerCase().includes('xaero') && m.mod_id?.toLowerCase().includes('minimap')) || 
        (m.display_name?.toLowerCase().includes('xaero') && m.display_name?.toLowerCase().includes('minimap')) ||
        m.mod_id?.toLowerCase().includes('journeymap') || 
        m.display_name?.toLowerCase().includes('journeymap') ||
        m.mod_id?.toLowerCase().includes('voxelmap') || 
        m.display_name?.toLowerCase().includes('voxelmap')
      )
    );
    if (minimapMods.length > 1) {
      list.push({
        id: 'conflict-multiple-minimaps',
        type: 'conflict',
        title: 'Несколько миникарт активны одновременно',
        description: `В вашей сборке включено несколько модов на миникарту: ${minimapMods.map(m => m.display_name || m.name).join(', ')}. Рекомендуется отключить или удалить лишние миникарты, чтобы избежать наложений интерфейса и снижения FPS.`,
        severity: 'high'
      });
    }

    // Automatic check of ALL enabled mod dependencies with smart resolution & JiJ filters
    mods.forEach(mod => {
      if (!mod.enabled) return;
      if (mod.depends && Array.isArray(mod.depends)) {
        mod.depends.forEach(depId => {
          const cleanDepId = depId.trim().toLowerCase();
          
          // 1. Skip standard Minecraft, Java, Loader internals
          if ([
            'minecraft', 'java', 'fabricloader', 'fabric', 'quiltloader', 'yarn', 'loom', 'forge', 'neoforge'
          ].includes(cleanDepId)) {
            return;
          }

          // 2. Skip Java packages and Maven coordinates (almost always JiJ or system bundled)
          if (
            cleanDepId.startsWith('org_') || 
            cleanDepId.startsWith('com_') || 
            cleanDepId.startsWith('net_') || 
            cleanDepId.startsWith('io_') ||
            cleanDepId.includes('.') || 
            cleanDepId.includes(':')
          ) {
            return;
          }

          // 3. Skip Fabric API sub-modules and general Fabric API dependencies (starting with fabric- or containing fabric_api)
          if (
            cleanDepId.startsWith('fabric-') || 
            cleanDepId.includes('fabric-api') || 
            cleanDepId.includes('fabric_api') ||
            cleanDepId.startsWith('fabric_')
          ) {
            return;
          }

          // 4. Skip common library dependencies that are optional, system-wide, or heavily JiJ-bundled
          const commonLibs = [
            'cloth-config', 'cloth_config', 'clothconfig',
            'architectury',
            'yet-another-config-lib', 'yet_another_config_lib', 'yacl',
            'cardinal-components',
            'kirin',
            'modmenu',
            'playerabilitylib', 'pal',
            'trinkets',
            'geckolib',
            'omega-config', 'omega_config',
            'fzzy-config', 'fzzy_config',
            'pehkui',
            'bclib',
            'spectrelib',
            'completeconfig',
            'libgui',
            'libip',
            'mixinextras', 'mixin-extras',
            'porting_lib',
            'viafabric',
            'placeholder-api', 'placeholderapi',
            'polymer',
            'sgui',
            'reborncore',
            'expandedstorage',
            'registrate',
            'flywheel',
            'patchouli',
            'sodium-extra',
            'indium',
            'iris',
            'kotlin', 'language-kotlin',
            'org_antlr', 'antlr'
          ];

          if (commonLibs.some(lib => cleanDepId.includes(lib))) {
            return;
          }

          // 5. Smart search in current mods list for match
          const isInstalled = mods.some(m => {
            if (!m.enabled) return false;
            const mId = m.mod_id?.toLowerCase() || '';
            const mName = m.name?.toLowerCase() || '';
            const mDisp = m.display_name?.toLowerCase() || '';

            // Exact match
            if (mId === cleanDepId || mName === cleanDepId) return true;

            // Normalized match (remove hyphens, underscores)
            const cleanNorm = cleanDepId.replace(/[-_]/g, '');
            const mIdNorm = mId.replace(/[-_]/g, '');
            const mNameNorm = mName.replace(/[-_]/g, '');
            if (mIdNorm === cleanNorm || mNameNorm === cleanNorm) return true;

            // Display name contains clean dependency ID
            if (mDisp.includes(cleanDepId)) return true;

            // Clean dependency contains mod_id or vice versa
            if (cleanDepId.includes(mId) && mId.length > 3) return true;
            if (mId.includes(cleanDepId) && cleanDepId.length > 3) return true;

            return false;
          });

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

  const conflicts = useMemo(() => getConflicts(), [mods, dismissedConflictIds]);

  const handleResolveConflict = async (actionType: string, payload?: any) => {
    if (actionType === 'install_dep') {
      try {
        alert('Установка Fabric API с Modrinth... Пожалуйста, подождите.');
        const res = await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: 'P7dR8mSH', 
            profileId: activeProfileId,
            gameVersion: activeProfile?.game_version,
            loader: activeProfile?.mod_loader
          }) // Fabric API
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
          body: JSON.stringify({ 
            projectId: payload.dependencyId, 
            versionId: 'latest', 
            folderPath: '', 
            profileId: activeProfileId,
            gameVersion: activeProfile?.game_version,
            loader: activeProfile?.mod_loader
          })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, profiles.length, minecraftPath, profiles.find(p => p.id === activeProfileId)?.game_version, profiles.find(p => p.id === activeProfileId)?.mod_loader]);

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
          
          if (typeof window !== 'undefined' && (window as any).electron) {
            try {
              const { ipcRenderer } = (window as any).electron;
              ipcRenderer.invoke('save-auth', profile).catch(() => {});
            } catch (e) {}
          }
          
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
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        ipcRenderer.invoke('save-auth', profile).catch(() => {});
      } catch (e) {}
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem('ely_session');
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        ipcRenderer.invoke('save-auth', null).catch(() => {});
      } catch (e) {}
    }
  };

  const handleNavigate = (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts', section?: string) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      if (section === 'ram' || section === 'game') {
        setSettingsSubTab('game');
        if (section === 'ram') {
          setHighlightRam(true);
          setTimeout(() => {
            setHighlightRam(false);
          }, 4000);
        }
      } else {
        setSettingsSubTab('account');
      }
    }
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
      <nav className="flex w-[88px] flex-col items-center border-r border-zinc-800/40 bg-zinc-950/60 backdrop-blur-md py-8 flex-shrink-0 z-20 shadow-2xl relative">
        <div className="mb-10">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 transition-all duration-300">
            <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col space-y-4 w-full px-2.5">
          <TabButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />} 
            label="Главная" 
          />
          <TabButton 
            active={activeTab === 'mods'} 
            onClick={() => setActiveTab('mods')} 
            icon={<FolderTree size={22} strokeWidth={activeTab === 'mods' ? 2.5 : 2} />} 
            label="Моды" 
          />
          <TabButton 
            active={activeTab === 'builder'} 
            onClick={() => setActiveTab('builder')} 
            icon={<DownloadCloud size={22} strokeWidth={activeTab === 'builder' ? 2.5 : 2} />} 
            label="Сборщик" 
          />

          <TabButton 
            active={activeTab === 'profiles'} 
            onClick={() => setActiveTab('profiles')} 
            icon={<PlaySquare size={22} strokeWidth={activeTab === 'profiles' ? 2.5 : 2} />} 
            label="Сборки" 
          />
          <TabButton 
            active={(activeTab as any) === 'screenshots'} 
            onClick={() => setActiveTab('screenshots' as any)} 
            icon={<ImageIcon size={22} strokeWidth={(activeTab as any) === 'screenshots' ? 2.5 : 2} />} 
            label="Скриншоты" 
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
        <div className="mt-auto mb-1 cursor-pointer group flex flex-col items-center" onClick={() => userProfile ? setActiveTab('settings') : setShowAuthModal(true)}>
          <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] overflow-hidden transition-all duration-300 shadow-inner">
            {userProfile ? (
              <PlayerHead2D username={userProfile.name} uuid={userProfile.id} className="w-full h-full rounded-full" />
            ) : (
              <User className="h-5 w-5 text-zinc-400 group-hover:text-cyan-400 transition-colors duration-300" />
            )}
          </div>
          <span className="text-[8px] font-bold text-zinc-500 group-hover:text-cyan-400 transition-colors mt-1.5 uppercase tracking-wider">
            {userProfile ? 'Профиль' : 'Войти'}
          </span>
        </div>
      </nav>

      {/* Main Window */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#09090b] relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full"></div>

        {/* Custom Title Bar */}
        <header 
          className="flex h-14 items-center justify-between border-b border-zinc-800/60 px-8 flex-shrink-0 z-10 backdrop-blur-md bg-[#09090b]/80 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="no-drag flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <span className="text-xl font-bold tracking-tight text-white">Layle Launcher</span>
            <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md shadow-inner">
              v{launcherVersion || '0.0.6'}
            </span>
          </div>
          <div className="no-drag flex items-center -mr-8" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {/* Minimize */}
            <button
              onClick={handleMinimize}
              className="no-drag flex items-center justify-center h-14 w-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
              title="Свернуть"
            >
              <Minus size={16} />
            </button>
            {/* Maximize */}
            <button
              onClick={handleMaximize}
              className="no-drag flex items-center justify-center h-14 w-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
              title="Развернуть"
            >
              <Square size={13} />
            </button>
            {/* Close */}
            <button
              onClick={handleClose}
              className="no-drag flex items-center justify-center h-14 w-14 text-zinc-400 hover:text-white hover:bg-red-600 active:bg-red-700 transition-colors focus:outline-none cursor-pointer rounded-tr-none"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        

        {/* Banner Alert for GDrive update */}
        {gdriveUpdateAvailable && activeProfile && activeProfile.syncSource === 'gdrive' && (
          <div className="bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border-b border-cyan-500/30 px-8 py-3 flex items-center justify-between animate-fade-in relative z-20">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-100">Доступно обновление сборки "{activeProfile.name}" на Google Диске!</p>
                <p className="text-[10px] text-zinc-400">Файлы на Диске были изменены. Обновите сборку, чтобы применить новые моды.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                Обновить сейчас
              </button>
            </div>
          </div>
        )}

        {/* Banner Alert for GDrive Auth Required */}
        {gdriveAuthRequired && activeProfile && activeProfile.syncSource === 'gdrive' && (
          <div className="bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border-b border-amber-500/30 px-8 py-3 flex items-center justify-between animate-fade-in relative z-20">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-100">Требуется авторизация Google</p>
                <p className="text-[10px] text-zinc-400">Для проверки обновлений GDSync и автоматического скачивания модов с Google Диска.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                Войти и обновить
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex flex-1 flex-row overflow-hidden relative z-10">
          {activeTab === 'home' && (
            <HomeTab 
              onNavigate={handleNavigate} 
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
              onRefresh={fetchMods}
              globalGamePath={globalGamePath}
              onOpenModrinth={() => setShowModrinthModal(true)}
              profiles={profiles}
              activeProfileId={modsTabProfileId}
              onSelectProfile={setModsTabProfileId}
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
              onOpenModrinth={() => setShowModrinthModal(true)}
            />
          )}
          {showModrinthModal && (
            <ModrinthModal 
              onClose={() => setShowModrinthModal(false)}
              onRefresh={fetchMods}
              activeProfileId={modsTabProfileId}
              activeProfile={profiles.find(p => p.id === modsTabProfileId) || activeProfile}
              globalGamePath={globalGamePath}
              profiles={profiles}
            />
          )}
          {activeTab === 'conflicts' && (
            <ConflictsTab 
              conflicts={conflicts}
              onResolveConflict={handleResolveConflict}
              onDismissConflict={handleDismissConflict}
            />
          )}
          {activeTab === 'builder' && (
            <ModrinthTab 
              onRefresh={fetchMods}
              activeProfileId={activeProfileId}
              activeProfile={activeProfile}
            />
          )}
          {(activeTab as any) === 'logs' && (
            <LogsTab activeProfileId={activeProfileId} globalGamePath={globalGamePath} />
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
              onCheckForUpdates={checkForUpdates}
              currentVersion={launcherVersion || '0.0.6'}
              initialSubTab={settingsSubTab}
              highlightRam={highlightRam}
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
              {/* Custom Elegant Dropdown for Profiles */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-200 text-sm font-semibold rounded-xl pl-4 pr-10 h-12 outline-none cursor-pointer transition-all flex items-center justify-between gap-3 shadow-inner backdrop-blur-md min-w-[180px] max-w-[260px] truncate select-none text-left"
                >
                  <span className="truncate pr-1">{activeProfile.name}</span>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    <ChevronDown size={18} className={`transition-transform duration-200 ${showProfileDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                  </div>
                </button>
                
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <div className="absolute bottom-full mb-2 right-0 w-[240px] bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-2 z-50 flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                      <div className="px-2.5 py-1 border-b border-zinc-900 mb-1">
                        <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-500">Доступные сборки</span>
                      </div>
                      {profiles.map(p => {
                        const isSelected = p.id === activeProfile.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              handleSelectProfile(p.id);
                              setShowProfileDropdown(false);
                            }}
                            className={`w-full flex flex-col gap-0.5 px-3 py-2 rounded-xl text-left transition-all ${
                              isSelected 
                                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.1)]' 
                                : 'hover:bg-zinc-900 border border-transparent text-zinc-400 hover:text-zinc-100'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold truncate flex items-center gap-1.5">
                                {p.is_favorite && <Star size={10} fill="#f59e0b" className="text-amber-500 shrink-0" />}
                                <span className="truncate">{p.name}</span>
                              </span>
                              {(p.syncSource === 'gdrive' || p.id === 'GDSync') && (
                                <span className="bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/20 text-[7px] uppercase font-bold tracking-wider font-mono">
                                  GDSync
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono">
                              <span className="bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800/40">Ver: {p.game_version}</span>
                              <span className="bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800/40 text-cyan-500/80">{p.mod_loader}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {(activeProfile?.id === 'GDSync' || activeProfile?.syncSource === 'gdrive') && (
                <button
                  onClick={() => setShowSyncModal(true)}
                  disabled={gameStatus !== 'idle'}
                  className="flex h-12 px-4 items-center justify-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/80 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest cursor-pointer"
                  title="Синхронизировать сборку через GDSync (Google Диск)"
                >
                  <RefreshCw size={14} />
                  Обновить
                </button>
              )}

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
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-50 group-hover:animate-shimmer -translate-x-full"></div>
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

      {showSyncModal && (
        <SyncModal 
          profileId={activeProfile.id}
          profile={activeProfile}
          onClose={(didSyncSucceed) => {
            setShowSyncModal(false);
            if (didSyncSucceed) {
              handleSelectProfile(activeProfile.id);
            }
          }}
        />
      )}
      
      {showUpdateModal && (
        <UpdateModal 
          updateInfo={updateInfo} 
          onClose={() => setShowUpdateModal(false)} 
        />
      )}
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

      <NotificationToast toasts={toasts} onClose={removeToast} />
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all duration-300 group relative ${
        active 
          ? 'text-cyan-400 bg-cyan-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(6,182,212,0.1)] border border-cyan-500/20' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 border border-transparent'
      }`}
    >
      {/* Animated Left Accent Indicator */}
      <div className={`absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-cyan-500 rounded-r-md transition-all duration-300 ${
        active ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
      }`} />

      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8.5px] font-black text-white border-2 border-zinc-950 animate-pulse z-10">
          {badge}
        </span>
      )}
      
      <div className={`transition-all duration-300 ${active ? 'scale-110 text-cyan-400' : 'group-hover:scale-110 group-hover:text-zinc-200'}`}>
        {icon}
      </div>
      
      <span className={`mt-1.5 text-[8.5px] uppercase tracking-wider font-bold transition-all duration-300 ${
        active 
          ? 'text-cyan-400 opacity-100 font-extrabold' 
          : 'text-zinc-500 opacity-70 group-hover:opacity-100 group-hover:text-zinc-300'
      }`}>
        {label}
      </span>
    </button>
  );
}

