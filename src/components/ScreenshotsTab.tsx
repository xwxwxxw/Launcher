import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FolderOpen, Trash2, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

export default function ScreenshotsTab({ activeProfileId, globalGamePath }: { activeProfileId: string, globalGamePath: string }) {
  const [screenshots, setScreenshots] = useState<{name: string, url: string, path: string, date: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/minecraft/screenshots?profileId=${activeProfileId}&globalPath=${encodeURIComponent(globalGamePath)}`);
      if (res.ok) {
        const data = await res.json();
        setScreenshots(data.screenshots || []);
        setError('');
        setSelected([]);
      } else {
        const err = await res.json();
        setError(err.error || 'Не удалось загрузить скриншоты');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScreenshots();
  }, [activeProfileId, globalGamePath]);

  const handleOpenFolder = async () => {
    try {
      await fetch(`/api/minecraft/open-screenshots-folder?profileId=${activeProfileId}&globalPath=${encodeURIComponent(globalGamePath)}`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Удалить ${selected.length} скриншотов?`)) return;
    
    try {
      const res = await fetch(`/api/minecraft/screenshots/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: selected })
      });
      if (res.ok) {
        fetchScreenshots();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (path: string) => {
    if (selected.includes(path)) {
      setSelected(selected.filter(p => p !== path));
    } else {
      setSelected([...selected, path]);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <ImageIcon className="text-emerald-500" size={28} />
            Скриншоты
          </h2>
          <p className="text-zinc-400 mt-1">Управление снимками экрана игры</p>
        </div>
        
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors border border-red-500/20"
            >
              <Trash2 size={16} />
              Удалить ({selected.length})
            </button>
          )}
          <button 
            onClick={fetchScreenshots}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700/50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button 
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition-colors border border-emerald-500/20"
          >
            <FolderOpen size={16} />
            Открыть папку
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle size={32} className="text-red-400 mb-3" />
          <h3 className="text-red-400 font-medium">{error}</h3>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>Скриншотов пока нет.</p>
          <p className="text-sm mt-1">Сделайте снимок в игре (клавиша F2).</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {screenshots.map(s => (
              <div 
                key={s.path} 
                onClick={() => toggleSelect(s.path)}
                className={`group relative rounded-xl overflow-hidden bg-zinc-900 border-2 transition-all cursor-pointer ${
                  selected.includes(s.path) 
                    ? 'border-emerald-500 shadow-lg shadow-emerald-900/20' 
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="aspect-video relative overflow-hidden bg-zinc-950">
                  <img src={s.url} alt={s.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  
                  {selected.includes(s.path) && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white truncate" title={s.name}>{s.name}</p>
                  <p className="text-xs text-zinc-500">{new Date(s.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
