import { useState, useEffect, useMemo } from 'react';
import { 
  Image as ImageIcon, 
  FolderOpen, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Download, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Search, 
  Calendar, 
  Play, 
  Pause,
  ArrowUpDown,
  FileImage
} from 'lucide-react';

export default function ScreenshotsTab({ activeProfileId, globalGamePath }: { activeProfileId: string, globalGamePath: string }) {
  const [screenshots, setScreenshots] = useState<{name: string, url: string, path: string, date: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/minecraft/screenshots?profileId=${activeProfileId}&globalPath=${encodeURIComponent(globalGamePath)}`);
      if (res.ok) {
        const data = await res.json();
        // Ensure screenshots are safe
        setScreenshots(data.screenshots || []);
        setError('');
        setSelected([]);
      } else {
        const err = await res.json();
        setError(err.error || 'Не удалось загрузить скриншоты');
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка подключения');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScreenshots();
    setLightboxIndex(null);
    setIsSlideshowPlaying(false);
  }, [activeProfileId, globalGamePath]);

  // Handle slideshow playback tick
  useEffect(() => {
    let interval: any;
    if (isSlideshowPlaying && lightboxIndex !== null) {
      interval = setInterval(() => {
        setLightboxIndex((prevIndex) => {
          if (prevIndex === null || filteredScreenshots.length === 0) return null;
          return (prevIndex + 1) % filteredScreenshots.length;
        });
      }, 3000); // 3 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isSlideshowPlaying, lightboxIndex, screenshots]);

  const handleOpenFolder = async () => {
    try {
      await fetch(`/api/minecraft/open-screenshots-folder?profileId=${activeProfileId}&globalPath=${encodeURIComponent(globalGamePath)}`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Вы действительно хотите удалить выбранные скриншоты (${selected.length} шт.)?`)) return;
    
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

  const toggleSelect = (path: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Avoid opening lightbox when clicking selection checkbox
    }
    if (selected.includes(path)) {
      setSelected(selected.filter(p => p !== path));
    } else {
      setSelected([...selected, path]);
    }
  };

  const handleSelectAll = () => {
    setSelected(filteredScreenshots.map(s => s.path));
  };

  const handleDeselectAll = () => {
    setSelected([]);
  };

  // Filter and sort screenshots
  const filteredScreenshots = useMemo(() => {
    let result = [...screenshots];
    
    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(query));
    }

    // 2. Sort by date
    result.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.date - a.date;
      } else {
        return a.date - b.date;
      }
    });

    return result;
  }, [screenshots, searchQuery, sortOrder]);

  // Lightbox Navigation
  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null || filteredScreenshots.length === 0) return;
    setLightboxIndex((prev) => {
      if (prev === null) return 0;
      return prev === 0 ? filteredScreenshots.length - 1 : prev - 1;
    });
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null || filteredScreenshots.length === 0) return;
    setLightboxIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % filteredScreenshots.length;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
        setIsSlideshowPlaying(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredScreenshots]);

  // Download screenshot
  const downloadScreenshot = (url: string, filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete single screenshot
  const deleteSingle = async (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Вы действительно хотите удалить этот скриншот?')) return;
    
    try {
      const res = await fetch(`/api/minecraft/screenshots/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [path] })
      });
      if (res.ok) {
        // If we are deleting the currently open lightbox image, close lightbox or move to prev
        if (lightboxIndex !== null) {
          if (filteredScreenshots.length <= 1) {
            setLightboxIndex(null);
            setIsSlideshowPlaying(false);
          } else {
            handlePrev();
          }
        }
        fetchScreenshots();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Banner & Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ImageIcon size={22} />
            </div>
            <span>Скриншоты</span>
            {screenshots.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {screenshots.length}
              </span>
            )}
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Снимки экрана, сохранённые в игровой сборке. Нажмите на снимок для перехода в режим галереи.
          </p>
        </div>
        
        {/* Actions panel */}
        <div className="flex items-center flex-wrap gap-2">
          {selected.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition-all border border-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Trash2 size={14} />
              <span>Удалить выбранные ({selected.length})</span>
            </button>
          )}

          <button 
            onClick={fetchScreenshots}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold rounded-xl transition-all border border-zinc-700/50 active:scale-[0.98]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
            <span>Обновить</span>
          </button>

          <button 
            onClick={handleOpenFolder}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl transition-all border border-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderOpen size={14} />
            <span>Папка со скриншотами</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      {screenshots.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-sm">
          {/* Left search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input
              type="text"
              placeholder="Поиск скриншота по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800"
              title="Изменить направление сортировки"
            >
              <ArrowUpDown size={12} className="text-emerald-500" />
              <span>{sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block"></div>

            <div className="flex items-center gap-1.5">
              {selected.length === filteredScreenshots.length && filteredScreenshots.length > 0 ? (
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Снять выделение
                </button>
              ) : (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
                  disabled={filteredScreenshots.length === 0}
                >
                  Выбрать все
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {error ? (
        <div className="flex-1 bg-red-500/5 border border-red-500/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
          <AlertTriangle size={36} className="text-red-400 mb-3" />
          <h3 className="text-red-400 font-semibold mb-1">Произошла ошибка</h3>
          <p className="text-zinc-500 text-xs max-w-md">{error}</p>
          <button 
            onClick={fetchScreenshots}
            className="mt-4 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all"
          >
            Попробовать снова
          </button>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-zinc-800/40 rounded-3xl flex flex-col items-center justify-center text-center p-12 text-zinc-500 bg-zinc-900/10">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
            <ImageIcon size={28} className="opacity-40 text-emerald-500" />
          </div>
          <h3 className="text-zinc-300 font-semibold text-sm">Скриншотов пока нет</h3>
          <p className="text-xs text-zinc-500 mt-1.5 max-w-xs">
            Запустите игру и сделайте великолепные снимки нажатием на клавишу <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">F2</kbd>. Они появятся здесь автоматически!
          </p>
          <button 
            onClick={fetchScreenshots}
            className="mt-5 flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all border border-zinc-700/50"
          >
            <RefreshCw size={12} />
            <span>Проверить снова</span>
          </button>
        </div>
      ) : filteredScreenshots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
          <FileImage size={32} className="opacity-30 mb-2" />
          <p className="text-xs font-medium">Ничего не найдено по вашему запросу</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
          >
            Сбросить поиск
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar pr-1 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredScreenshots.map((s, idx) => {
              const isSelected = selected.includes(s.path);
              return (
                <div 
                  key={s.path} 
                  onClick={() => setLightboxIndex(idx)}
                  className={`group relative rounded-2xl overflow-hidden bg-zinc-950 border transition-all duration-300 flex flex-col select-none cursor-pointer ${
                    isSelected 
                      ? 'border-emerald-500/80 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20' 
                      : 'border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/10 hover:shadow-xl hover:shadow-black/20'
                  }`}
                >
                  {/* Image container */}
                  <div className="aspect-video relative overflow-hidden bg-zinc-900 border-b border-zinc-900">
                    <img 
                      src={s.url} 
                      alt={s.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                      loading="lazy" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dark glass effect overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-10 h-10 rounded-full bg-zinc-900/95 text-emerald-400 border border-zinc-700/60 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Maximize2 size={16} />
                      </div>
                    </div>

                    {/* Checkbox selector in top-left */}
                    <div 
                      onClick={(e) => toggleSelect(s.path, e)}
                      className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all shadow-md ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-400 text-white' 
                          : 'bg-zinc-950/70 backdrop-blur-md border-zinc-700 hover:border-zinc-500 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>

                    {/* Floating mini actions for individual file */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => downloadScreenshot(s.url, s.name, e)}
                        className="w-7 h-7 rounded-lg bg-zinc-950/85 hover:bg-emerald-500 hover:text-white border border-zinc-800 text-zinc-300 flex items-center justify-center shadow-md transition-all active:scale-90"
                        title="Скачать"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={(e) => deleteSingle(s.path, e)}
                        className="w-7 h-7 rounded-lg bg-zinc-950/85 hover:bg-red-600 hover:text-white border border-zinc-800 text-zinc-300 flex items-center justify-center shadow-md transition-all active:scale-90"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Timestamp overlay (rendered nicely) */}
                    <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-zinc-950/70 backdrop-blur-md border border-zinc-800/40 text-[9px] font-medium text-zinc-400 tracking-wide flex items-center gap-1">
                      <Calendar size={9} />
                      <span>{new Date(s.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Details block */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <p 
                      className="text-xs font-semibold text-zinc-200 truncate pr-4 group-hover:text-emerald-400 transition-colors" 
                      title={s.name}
                    >
                      {s.name}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] text-zinc-600 uppercase font-semibold tracking-wider">
                        Minecraft
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && filteredScreenshots[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[100] bg-zinc-950/98 backdrop-blur-xl flex flex-col justify-between animate-in fade-in duration-300 select-none"
          onClick={() => {
            setLightboxIndex(null);
            setIsSlideshowPlaying(false);
          }}
        >
          {/* Top header bar */}
          <div 
            className="p-4 flex items-center justify-between bg-zinc-950/60 border-b border-zinc-900 backdrop-blur-md z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-md md:max-w-xl">
                {filteredScreenshots[lightboxIndex].name}
              </h3>
              <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1.5">
                <span>Индекс: {lightboxIndex + 1} из {filteredScreenshots.length}</span>
                <span>•</span>
                <span>{new Date(filteredScreenshots[lightboxIndex].date).toLocaleString()}</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Slideshow button */}
              <button
                onClick={() => setIsSlideshowPlaying(p => !p)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSlideshowPlaying 
                    ? 'bg-emerald-500 text-white border-emerald-400' 
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Автопроигрывание скриншотов"
              >
                {isSlideshowPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span className="hidden sm:inline">{isSlideshowPlaying ? 'Пауза' : 'Слайд-шоу'}</span>
              </button>

              {/* Download */}
              <button
                onClick={() => downloadScreenshot(filteredScreenshots[lightboxIndex].url, filteredScreenshots[lightboxIndex].name)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all flex items-center justify-center"
                title="Скачать скриншот"
              >
                <Download size={14} />
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteSingle(filteredScreenshots[lightboxIndex].path)}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 transition-all flex items-center justify-center"
                title="Удалить скриншот"
              >
                <Trash2 size={14} />
              </button>

              {/* Vertical divider */}
              <div className="w-[1px] h-6 bg-zinc-800 mx-1"></div>

              {/* Close */}
              <button
                onClick={() => {
                  setLightboxIndex(null);
                  setIsSlideshowPlaying(false);
                }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all flex items-center justify-center"
                title="Закрыть"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Main big image view */}
          <div className="flex-1 relative flex items-center justify-center px-4 md:px-12 py-6 overflow-hidden">
            {/* Left Nav Button */}
            <button
              onClick={handlePrev}
              className="absolute left-4 md:left-6 w-12 h-12 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white flex items-center justify-center transition-all z-20 shadow-2xl active:scale-90"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>

            {/* The Image */}
            <div 
              className="relative max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={filteredScreenshots[lightboxIndex].url} 
                alt={filteredScreenshots[lightboxIndex].name} 
                className="max-w-full max-h-[72vh] md:max-h-[76vh] rounded-2xl object-contain shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-zinc-900"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Right Nav Button */}
            <button
              onClick={handleNext}
              className="absolute right-4 md:right-6 w-12 h-12 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white flex items-center justify-center transition-all z-20 shadow-2xl active:scale-90"
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Bottom filmstrip strip */}
          <div 
            className="bg-zinc-950/90 border-t border-zinc-900 py-3.5 px-4 backdrop-blur-md z-10 overflow-x-auto custom-scrollbar flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mx-auto">
              {filteredScreenshots.map((item, index) => {
                const isActive = index === lightboxIndex;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLightboxIndex(index)}
                    className={`relative w-14 h-9 rounded-lg overflow-hidden transition-all duration-200 border-2 shrink-0 ${
                      isActive 
                        ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/25' 
                        : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
                    }`}
                  >
                    <img 
                      src={item.url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      loading="lazy" 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
