import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Loader2, Star, DownloadCloud, Box, Globe, Palette, Sun, Layers, ShieldAlert } from 'lucide-react';
import { Profile } from '../types';

interface ModrinthProject {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  author: string;
  versions: string[];
  client_side?: string;
  server_side?: string;
}

interface ModrinthModalProps {
  onClose: () => void;
  onRefresh: () => void;
  activeProfileId: string;
  activeProfile?: Profile;
  globalGamePath?: string;
}

export default function ModrinthModal({ onClose, onRefresh, activeProfileId, activeProfile, globalGamePath }: ModrinthModalProps) {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<'mod' | 'resourcepack' | 'shader'>('mod');
  const installTarget = 'client' as 'client' | 'server';
  const [results, setResults] = useState<ModrinthProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // For dependency recommendation
  const [suggestedDeps, setSuggestedDeps] = useState<{ projectId: string, title: string, slug: string }[]>([]);
  const [currentModName, setCurrentModName] = useState('');
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [gameVersion, setGameVersion] = useState<string>('');
  const [modLoader, setModLoader] = useState<string>('');

  useEffect(() => {
    if (activeProfile) {
      setGameVersion(activeProfile.game_version || '');
      const loader = activeProfile.mod_loader?.toLowerCase() || '';
      setModLoader(loader === 'vanilla' ? '' : loader);
    }
  }, [activeProfile]);

  useEffect(() => {
    handleSearch();
  }, [contentType, gameVersion, modLoader]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      let facetsArr: string[] = [`["project_type:${contentType}"]`];
      
      if (contentType === 'mod' && modLoader) {
        facetsArr.push(`["categories:${modLoader}"]`);
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

  const handleInstall = async (projectId: string) => {
    setInstallingId(projectId);
    try {
      const destSub = contentType === 'mod' ? 'mods' : (contentType === 'resourcepack' ? 'resourcepacks' : 'shaderpacks');
      const destPath = `${globalGamePath || './.minecraft'}/${destSub}`;
      const res = await fetch('/api/mods/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          versionId: 'latest', 
          folderPath: destPath, 
          profileId: 'global', 
          contentType, 
          installTarget,
          minecraftPath: globalGamePath 
        })
      });
      const data = await res.json();
      
      onRefresh(); // Refresh global states and count

      if (data.success && data.dependenciesSuggested && data.dependenciesSuggested.length > 0) {
        setCurrentModName(data.mod.display_name || data.mod.name);
        setSuggestedDeps(data.dependenciesSuggested);
      } else if (data.success) {
        // Simple visual feedback
        alert('Успешно установлено!');
      } else {
        alert('Не удалось установить: ' + (data.error || 'ошибка сервера'));
      }
      
      setTimeout(() => {
        setInstallingId(null);
      }, 500);
    } catch (err) {
      console.error('Failed to install', err);
      alert('Ошибка при соединении с сервером установки.');
      setInstallingId(null);
    }
  };

  const handleInstallDependencies = async () => {
    setIsInstallingDeps(true);
    for (const dep of suggestedDeps) {
      try {
        const destSub = contentType === 'mod' ? 'mods' : (contentType === 'resourcepack' ? 'resourcepacks' : 'shaderpacks');
        const destPath = `${globalGamePath || './.minecraft'}/${destSub}`;
        await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: dep.projectId, 
            versionId: 'latest', 
            folderPath: destPath, 
            profileId: 'global', 
            installTarget,
            minecraftPath: globalGamePath 
          })
        });
      } catch (e) {
        console.error('Failed to install dependency mod:', dep.title, e);
      }
    }
    onRefresh();
    setIsInstallingDeps(false);
    setSuggestedDeps([]);
    alert('Все необходимые зависимости успешно загружены!');
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full h-full max-w-5xl flex flex-col overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all z-50 border border-zinc-800/60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

      {/* Top Bar Area */}
      <div className="bg-[#09090b]/95 border-b border-zinc-800/60 p-6 flex flex-col gap-6 flex-shrink-0 z-10 relative">
        <div className="flex items-end justify-between pr-12">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400/90 uppercase tracking-widest font-bold">
                Онлайн-сервис • Установка модов, ресурспаков и шейдеров
              </p>
              {loading && <Loader2 size={12} className="animate-spin text-emerald-400" />}
            </div>

            {/* Content Switcher */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
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

              <select
                value={gameVersion}
                onChange={(e) => setGameVersion(e.target.value)}
                className="bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              >
                <option value="" className="bg-[#0b0b0c] text-zinc-300">Все версии Minecraft</option>
                <option value="1.21" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.21</option>
                <option value="1.20.4" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.20.4</option>
                <option value="1.20.1" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.20.1</option>
                <option value="1.19.4" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.19.4</option>
                <option value="1.19.2" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.19.2</option>
                <option value="1.18.2" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.18.2</option>
                <option value="1.16.5" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.16.5</option>
                <option value="1.12.2" className="bg-[#0b0b0c] text-zinc-300">Minecraft 1.12.2</option>
              </select>

              {contentType === 'mod' && (
                <select
                  value={modLoader}
                  onChange={(e) => setModLoader(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                >
                  <option value="" className="bg-[#0b0b0c] text-zinc-300">Все загрузчики</option>
                  <option value="fabric" className="bg-[#0b0b0c] text-zinc-300">Fabric</option>
                  <option value="forge" className="bg-[#0b0b0c] text-zinc-300">Forge</option>
                  <option value="neoforge" className="bg-[#0b0b0c] text-zinc-300">NeoForge</option>
                  <option value="quilt" className="bg-[#0b0b0c] text-zinc-300">Quilt</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
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
                    {contentType === 'mod' && installTarget === 'client' && project.client_side === 'unsupported' && (
                      <WarningLabel type="client" />
                    )}
                    {contentType === 'mod' && installTarget === 'server' && project.server_side === 'unsupported' && (
                      <WarningLabel type="server" />
                    )}
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
      </div>
    </div>
  );
}

function WarningLabel({ type }: { type: 'client' | 'server' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[9px] uppercase tracking-widest font-bold w-fit mt-2">
      <ShieldAlert size={10} />
      Не работает на {type === 'client' ? 'клиенте' : 'сервере'}!
    </div>
  );
}
