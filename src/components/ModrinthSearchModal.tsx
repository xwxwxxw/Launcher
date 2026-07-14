import React, { useState, useEffect } from 'react';
import { X, Search, Download, Loader2, Star, DownloadCloud, Box, Globe } from 'lucide-react';

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

export default function ModrinthSearchModal({ onClose, onInstalled, activeProfileId }: { onClose: () => void, onInstalled?: () => void, activeProfileId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ModrinthProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const [suggestedDeps, setSuggestedDeps] = useState<{ projectId: string, title: string, slug: string }[]>([]);
  const [currentModName, setCurrentModName] = useState('');
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    const timeout = setTimeout(() => {
      handleSearch();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Facets to search only for mods
      const facets = encodeURIComponent('[["project_type:mod"]]');
      const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${facets}&limit=10`);
      const data = await res.json();
      setResults(data.hits);
    } catch (err) {
      console.error('Error searching Modrinth:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (projectId: string) => {
    setInstallingId(projectId);
    try {
      // In a real app we would pick version by minecraft version
      // Mocking installation via backend
      const res = await fetch('/api/mods/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, versionId: 'latest', folderPath: '', profileId: activeProfileId })
      });
      const data = await res.json();
      
      if (onInstalled) {
        onInstalled();
      }

      if (data.success && data.dependenciesSuggested && data.dependenciesSuggested.length > 0) {
        setCurrentModName(data.mod.display_name || data.mod.name);
        setSuggestedDeps(data.dependenciesSuggested);
      }
      
      // Show success briefly
      setTimeout(() => {
        setInstallingId(null);
      }, 500);
    } catch (err) {
      console.error('Failed to install', err);
      setInstallingId(null);
    }
  };

  const handleInstallDependencies = async () => {
    setIsInstallingDeps(true);
    for (const dep of suggestedDeps) {
      try {
        await fetch('/api/mods/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: dep.projectId, versionId: 'latest', folderPath: '', profileId: activeProfileId })
        });
      } catch (e) {
        console.error('Failed to install dependency mod:', dep.title, e);
      }
    }
    if (onInstalled) {
      onInstalled();
    }
    setIsInstallingDeps(false);
    setSuggestedDeps([]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[150px] bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full"></div>

        {/* Header & Search Bar */}
        <div className="p-8 border-b border-zinc-800/60 bg-zinc-900/30 relative z-10 flex flex-col gap-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Globe size={24} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-0.5">Экосистема</p>
                <h2 className="text-2xl font-bold text-white tracking-tight">Поиск на Modrinth</h2>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Найти модификацию..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner placeholder:text-zinc-600 font-medium"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" size={18} />
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10 scrollbar-none">
          {!query ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-xl">
                <Box size={32} className="text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold text-zinc-300 mb-2 tracking-tight">Введите название</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Начните вводить название модификации, чтобы найти её в крупнейшем открытом репозитории Modrinth.
              </p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <p className="text-sm font-medium text-zinc-400">По вашему запросу ничего не найдено.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map(mod => (
                <div key={mod.project_id} className="bg-zinc-900/40 border border-zinc-800/40 rounded-3xl p-5 flex gap-5 hover:border-emerald-500/30 hover:bg-zinc-800/40 transition-all backdrop-blur-sm group hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  {mod.icon_url ? (
                    <img 
                      src={mod.icon_url} 
                      alt={mod.title} 
                      className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 object-cover shrink-0 shadow-md group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://cdn.modrinth.com/data/AANobbMI/d6fdfa8fb485121401f80be0bd7e5e347e3a1f10.png';
                      }}
                    />
                  ) : (
                    <img 
                      src="https://cdn.modrinth.com/data/AANobbMI/d6fdfa8fb485121401f80be0bd7e5e347e3a1f10.png" 
                      alt="fallback icon" 
                      className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 object-cover shrink-0 shadow-md" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-zinc-100 truncate tracking-tight">{mod.title}</h3>
                      <button 
                        onClick={() => handleInstall(mod.project_id)}
                        disabled={installingId === mod.project_id}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 p-2 rounded-xl transition-all disabled:opacity-50 shrink-0"
                      >
                        {installingId === mod.project_id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                    </div>
                    
                    <p className="text-xs text-zinc-400/90 leading-relaxed font-medium line-clamp-2 mb-3 flex-1">{mod.description}</p>
                    
                    <div className="flex items-center gap-4 mt-auto">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        <DownloadCloud size={12} />
                        {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(mod.downloads)}
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">
                        <span>by {mod.author}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {suggestedDeps.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0b0b0c] border border-amber-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ambient amber glow */}
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
              Для стабильной работы этого мода требуются следующие важные зависимости. Рекомендуем установить их прямо сейчас:
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
  );
}
