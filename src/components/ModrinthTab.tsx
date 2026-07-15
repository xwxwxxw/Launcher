import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Loader2, Star, DownloadCloud, Box, Globe, Palette, Sun, Layers, Folder, Server, History, X } from 'lucide-react';
import { Profile } from '../types';
import CustomSelect from './CustomSelect';

interface ModrinthProject {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  author: string;
  versions: string[];
}

interface ModrinthTabProps {
  onRefresh: () => void;
  activeProfileId: string;
  activeProfile?: Profile;
}

export default function ModrinthTab({ onRefresh, activeProfileId, activeProfile }: ModrinthTabProps) {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<'mod' | 'resourcepack' | 'shader'>('mod');
  const [results, setResults] = useState<ModrinthProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Independent Builder states
  const [clientFolder, setClientFolder] = useState(() => localStorage.getItem('builder_client_folder') || '');
  const [serverFolder, setServerFolder] = useState(() => localStorage.getItem('builder_server_folder') || '');
  const [installTarget, setInstallTarget] = useState<'client' | 'server'>('client');
  const [installHistory, setInstallHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('builder_install_history') || '[]');
    } catch {
      return [];
    }
  });

  // Filters
  const [fWorldgen, setFWorldgen] = useState(false);
  const [fClient, setFClient] = useState(false);
  const [fServer, setFServer] = useState(false);
  const [fLibrary, setFLibrary] = useState(false);
  const [fOpt, setFOpt] = useState(false);
  const [gameVersion, setGameVersion] = useState<string>(() => localStorage.getItem('builder_game_version') || '');
  const [modLoader, setModLoader] = useState<string>(() => localStorage.getItem('builder_mod_loader') || '');

  // For dependency recommendation
  const [suggestedDeps, setSuggestedDeps] = useState<{ projectId: string, title: string, slug: string }[]>([]);
  const [currentModName, setCurrentModName] = useState('');
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);

  const [showHistory, setShowHistory] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('builder_install_history', JSON.stringify(installHistory));
  }, [installHistory]);

  useEffect(() => {
    localStorage.setItem('builder_game_version', gameVersion);
  }, [gameVersion]);

  useEffect(() => {
    localStorage.setItem('builder_mod_loader', modLoader);
  }, [modLoader]);

  useEffect(() => {
    handleSearch();
  }, [contentType, fWorldgen, fClient, fServer, fLibrary, fOpt, gameVersion, modLoader]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelectFolder = async (type: 'client' | 'server') => {
    const { ipcRenderer } = (window as any).require('electron');
    const defaultPath = type === 'client' ? clientFolder : serverFolder;
    const selected = await ipcRenderer.invoke('select-directory', defaultPath);
    if (selected) {
      if (type === 'client') {
        setClientFolder(selected);
        localStorage.setItem('builder_client_folder', selected);
      } else {
        setServerFolder(selected);
        localStorage.setItem('builder_server_folder', selected);
      }
    }
  };

  const handleSearch = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      let facetsArr: string[] = [`["project_type:${contentType}"]`];
      
      if (contentType === 'mod') {
        if (fWorldgen) facetsArr.push(`["categories:worldgen"]`);
        if (fLibrary) facetsArr.push(`["categories:library"]`);
        if (fOpt) facetsArr.push(`["categories:optimization"]`);
        if (fClient) facetsArr.push(`["categories:client_side"]`);
        if (fServer) facetsArr.push(`["categories:server_side"]`);
        
        if (modLoader) {
          facetsArr.push(`["categories:${modLoader}"]`);
        }
      }

      if (gameVersion) {
        facetsArr.push(`["versions:${gameVersion}"]`);
      }

      const facets = encodeURIComponent(`[${facetsArr.join(',')}]`);
      const searchUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${facets}&limit=16`;
      const res = await fetch(searchUrl, { signal: controller.signal });
      const data = await res.json();
      setResults(data.hits || []);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Ignore aborts
      }
      console.error('Error searching Modrinth:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const addToHistory = (project: any, status: string) => {
    setInstallHistory(prev => {
      const newEntry = {
        id: Date.now().toString(),
        projectId: project.project_id || project.projectId,
        title: project.title || project.name,
        type: contentType,
        target: installTarget,
        status,
        time: Date.now()
      };
      return [newEntry, ...prev].slice(0, 50); // Keep last 50
    });
  };

  const handleInstall = async (projectId: string) => {
    const targetFolder = installTarget === 'client' ? clientFolder : serverFolder;
    if (!targetFolder) {
      alert(`Пожалуйста, выберите папку для ${installTarget === 'client' ? 'клиента' : 'сервера'} перед установкой.`);
      return;
    }

    const project = results.find(r => r.project_id === projectId) || { project_id: projectId, title: projectId };
    setInstallingId(projectId);
    try {
      const res = await fetch('/api/mods/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          versionId: 'latest', 
          folderPath: targetFolder, 
          installTarget,
          contentType 
        })
      });
      const data = await res.json();

      if (data.success && data.dependenciesSuggested && data.dependenciesSuggested.length > 0) {
        setCurrentModName(data.mod.display_name || data.mod.name);
        setSuggestedDeps(data.dependenciesSuggested);
        addToHistory(project, 'Установлено (ожидание зависимостей)');
      } else if (data.success) {
        addToHistory(project, 'Установлено');
      } else {
        addToHistory(project, 'Ошибка: ' + (data.error || 'серверная ошибка'));
        alert('Не удалось установить: ' + (data.error || 'ошибка сервера'));
      }
      
      setTimeout(() => {
        setInstallingId(null);
      }, 500);
    } catch (err) {
      console.error('Failed to install', err);
      addToHistory(project, 'Ошибка соединения');
      alert('Ошибка при соединении с сервером установки.');
      setInstallingId(null);
    }
  };

  const handleInstallDependencies = async () => {
    const targetFolder = installTarget === 'client' ? clientFolder : serverFolder;
    setIsInstallingDeps(true);
    for (const dep of suggestedDeps) {
      try {
        const res = await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: dep.projectId, 
            versionId: 'latest', 
            folderPath: targetFolder,
            installTarget
          })
        });
        const data = await res.json();
        addToHistory({ projectId: dep.projectId, title: dep.title }, data.success ? 'Установлено (Зависимость)' : 'Ошибка установки');
      } catch (e) {
        console.error('Failed to install dependency mod:', dep.title, e);
        addToHistory({ projectId: dep.projectId, title: dep.title }, 'Ошибка соединения');
      }
    }
    setIsInstallingDeps(false);
    setSuggestedDeps([]);
    alert('Зависимости обработаны!');
  };

  const getPlaceholderText = () => {
    if (contentType === 'resourcepack') return 'Искать наборы ресурсов...';
    if (contentType === 'shader') return 'Искать шейдеры...';
    return 'Искать модификации на Modrinth...';
  };

  const getFallbackIcon = () => {
    if (contentType === 'resourcepack') {
      return 'https://cdn-icons-png.flaticon.com/512/3306/3306612.png';
    }
    if (contentType === 'shader') {
      return 'https://cdn-icons-png.flaticon.com/512/1048/1048953.png';
    }
    return 'https://cdn.modrinth.com/data/AANobbMI/d6fdfa8fb485121401f80be0bd7e5e347e3a1f10.png';
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Bar Area */}
      <div className="bg-[#09090b]/95 backdrop-blur-sm border-b border-zinc-800/60 p-6 pt-8 flex flex-col gap-6 flex-shrink-0 z-10 relative">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400/90 uppercase tracking-widest font-bold">
                Онлайн-сервис • Поиск и моментальная сборка сборок
              </p>
              {loading && <Loader2 size={12} className="animate-spin text-emerald-400" />}
            </div>

            {/* Content Switcher */}
            <div className="flex flex-col gap-3 mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-1 shadow-inner w-fit">
                  <button
                    onClick={() => setContentType('mod')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      contentType === 'mod' ? 'bg-zinc-800 text-emerald-400 shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Layers size={14} />
                    <span>Найти Моды</span>
                  </button>
                  <button
                    onClick={() => setContentType('resourcepack')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      contentType === 'resourcepack' ? 'bg-zinc-800 text-amber-400 shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Palette size={14} />
                    <span>Найти Ресурспаки</span>
                  </button>
                  <button
                    onClick={() => setContentType('shader')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      contentType === 'shader' ? 'bg-zinc-800 text-cyan-400 shadow' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Sun size={14} />
                    <span>Найти Шейдеры</span>
                  </button>
                </div>

                <CustomSelect
                  value={gameVersion}
                  onChange={setGameVersion}
                  options={[
                    { value: '', label: 'Все версии Minecraft' },
                    { value: '1.21', label: 'Minecraft 1.21' },
                    { value: '1.20.4', label: 'Minecraft 1.20.4' },
                    { value: '1.20.1', label: 'Minecraft 1.20.1' },
                    { value: '1.19.4', label: 'Minecraft 1.19.4' },
                    { value: '1.19.2', label: 'Minecraft 1.19.2' },
                    { value: '1.18.2', label: 'Minecraft 1.18.2' },
                    { value: '1.16.5', label: 'Minecraft 1.16.5' },
                    { value: '1.12.2', label: 'Minecraft 1.12.2' }
                  ]}
                  className="w-56"
                />

                {contentType === 'mod' && (
                  <CustomSelect
                    value={modLoader}
                    onChange={setModLoader}
                    options={[
                      { value: '', label: 'Все загрузчики' },
                      { value: 'fabric', label: 'Fabric' },
                      { value: 'forge', label: 'Forge' },
                      { value: 'neoforge', label: 'NeoForge' },
                      { value: 'quilt', label: 'Quilt' }
                    ]}
                    className="w-48"
                  />
                )}
              </div>

              {/* Filters */}
              {contentType === 'mod' && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFClient(!fClient)} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${fClient ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>Клиентский</button>
                  <button onClick={() => setFServer(!fServer)} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${fServer ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>Серверный</button>
                  <button onClick={() => setFWorldgen(!fWorldgen)} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${fWorldgen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>Генерация мира</button>
                  <button onClick={() => setFLibrary(!fLibrary)} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${fLibrary ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>Библиотека</button>
                  <button onClick={() => setFOpt(!fOpt)} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${fOpt ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>Оптимизация</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-zinc-800/60 bg-zinc-900/40">
                <button 
                  onClick={() => setInstallTarget('client')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${installTarget === 'client' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:bg-zinc-800/50'}`}
                >
                  <Folder size={12} />
                  Клиент
                </button>
                <button 
                  onClick={() => setInstallTarget('server')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${installTarget === 'server' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:bg-zinc-800/50'}`}
                >
                  <Server size={12} />
                  Сервер
                </button>
              </div>
              <button
                onClick={() => handleSelectFolder(installTarget)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:text-white hover:bg-zinc-800 truncate max-w-[200px]"
                title={installTarget === 'client' ? clientFolder : serverFolder}
              >
                {(installTarget === 'client' ? clientFolder : serverFolder) || 'Выбрать папку...'}
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 flex items-center gap-2"
              >
                <History size={14} />
                История
              </button>
            </div>
            <div className="relative w-80">
              <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder={getPlaceholderText()} 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-zinc-600 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-none relative">
        {results.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center mb-6">
              <Globe className="text-zinc-600 animate-pulse" size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-zinc-300 mb-2">Начните поиск</p>
            <p className="text-xs text-zinc-500 mb-6 max-w-sm">
              Введите запрос для поиска модов, шейдеров или ресурспаков. Вся загрузка и установка происходит автоматически.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12 animate-in fade-in duration-300">
            {results.map(project => (
              <div 
                key={project.project_id} 
                className="bg-zinc-900/40 border border-zinc-800/40 rounded-3xl p-5 flex gap-5 hover:border-emerald-500/30 hover:bg-zinc-800/40 transition-all backdrop-blur-sm group hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"></div>

                <div className="w-16 h-16 bg-zinc-950 rounded-xl border border-zinc-800/80 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner p-1">
                  {project.icon_url ? (
                    <img 
                      src={project.icon_url} 
                      alt={project.title} 
                      className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.src = getFallbackIcon();
                      }}
                    />
                  ) : (
                    <img 
                      src={getFallbackIcon()} 
                      alt="fallback" 
                      className="w-full h-full object-contain rounded-lg" 
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-zinc-100 truncate pr-4 tracking-tight group-hover:text-emerald-400 transition-colors">
                        {project.title}
                      </h3>
                      <button 
                        onClick={() => handleInstall(project.project_id)}
                        disabled={installingId === project.project_id}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/40 p-2 rounded-xl transition-all disabled:opacity-50 shrink-0"
                        title="Установить в текущую сборку"
                      >
                        {installingId === project.project_id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Download size={15} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'Описание отсутствует.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-2 border-t border-zinc-800/40">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                      <DownloadCloud size={12} />
                      {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(project.downloads)}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">
                      <span>by {project.author}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Dependencies modal */}
      {suggestedDeps.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0b0b0c] border border-amber-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-amber-500/10 blur-2xl pointer-events-none rounded-full"></div>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                <Box size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Нужны зависимости</h3>
                <p className="text-xs text-zinc-500">Для мода "{currentModName}"</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-5">
              Для стабильной работы этой сборки требуются следующие важные зависимости. Рекомендуем установить их прямо сейчас:
            </p>

            <div className="space-y-2.5 mb-6">
              {suggestedDeps.map((dep) => (
                <div key={dep.projectId} className="flex items-center gap-3 bg-zinc-950/60 border border-zinc-850 p-3.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-sm text-zinc-200 font-bold">{dep.title}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSuggestedDeps([])}
                disabled={isInstallingDeps}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50"
              >
                Пропустить
              </button>
              <button
                onClick={handleInstallDependencies}
                disabled={isInstallingDeps}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl py-3 text-xs font-extrabold transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isInstallingDeps ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-zinc-950" />
                    Установка...
                  </>
                ) : (
                  'Установить все'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0b0b0c] border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-400">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">История установок</h3>
                  <p className="text-xs text-zinc-500">Последние 50 загруженных модов и ресурспаков</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none">
              {installHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <History size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">История пуста</p>
                </div>
              ) : (
                installHistory.map(entry => (
                  <div key={entry.id} className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-200">{entry.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                          {entry.type}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {entry.target === 'client' ? 'Клиент' : 'Сервер'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${entry.status.includes('Ошибка') ? 'text-red-400' : 'text-zinc-500'}`}>
                        {entry.status}
                      </p>
                    </div>
                    <div className="text-xs text-zinc-600 font-mono">
                      {new Date(entry.time).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-800/60 flex justify-end">
              <button
                onClick={() => setInstallHistory([])}
                className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
              >
                Очистить историю
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
