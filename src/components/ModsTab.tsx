import React, { useState } from 'react';
import { ModInfo } from '../types';
import { RefreshCw, FolderOpen, CheckSquare, Trash2, Search, Package, DownloadCloud, Globe } from 'lucide-react';
import DependencyTreeModal from './DependencyTreeModal';
import ModrinthSearchModal from './ModrinthSearchModal';

export default function ModsTab() {
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'client' | 'server' | 'both'>('client');
  const [search, setSearch] = useState('');
  const [showModrinthModal, setShowModrinthModal] = useState(false);
  
  // Filters
  const [fWorldgen, setFWorldgen] = useState(false);
  const [fClient, setFClient] = useState(false);
  const [fServer, setFServer] = useState(false);
  const [fHeavy, setFHeavy] = useState(false);
  const [fLibrary, setFLibrary] = useState(false);
  const [fOpt, setFOpt] = useState(false);

  const [selectedMod, setSelectedMod] = useState<ModInfo | null>(null);

  const handleScan = async (path: string = '') => {
    setLoading(true);
    try {
      const res = await fetch('/api/mods/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: path })
      });
      const data = await res.json();
      setMods(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpdateMods = async () => {
    setUpdating(true);
    try {
      const isAuto = localStorage.getItem('auto_update_mods') === '1';
      const res = await fetch('/api/mods/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoUpdate: isAuto })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Успешно: ${data.message} Обновлено ${data.updatedCount} модов.`);
        await handleScan(''); // Rescan after update
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при обновлении модов.');
    }
    setUpdating(false);
  };

  const filteredMods = mods.filter(m => {
    if (viewMode === 'client' && m.environment === 'server') return false;
    if (viewMode === 'server' && m.environment === 'client') return false;

    if (search && !m.display_name.toLowerCase().includes(search.toLowerCase()) && !m.mod_id.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (fWorldgen && !m.is_worldgen) return false;
    if (fClient && !m.is_client) return false;
    if (fServer && !m.is_server) return false;
    if (fHeavy && !m.is_heavy) return false;
    if (fLibrary && !m.is_library) return false;
    if (fOpt && !m.is_optimization) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Bar Area */}
      <div className="bg-[#09090b]/95 backdrop-blur-sm border-b border-zinc-800/60 p-6 pt-8 flex flex-col gap-6 flex-shrink-0 z-10 relative">
        
        {/* Actions & Title */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400/90 uppercase tracking-widest font-bold">
                {loading ? 'Идет сканирование...' : `Локальная директория • ${mods.length} jar-файлов`}
              </p>
              {loading && <RefreshCw size={12} className="animate-spin text-blue-400" />}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowModrinthModal(true)} 
              className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[11px] uppercase tracking-widest font-bold text-blue-400 transition-all shadow-sm"
            >
              <Globe size={16} />
              <span>Найти моды</span>
            </button>
            <button 
              onClick={handleUpdateMods} 
              disabled={updating}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[11px] uppercase tracking-widest font-bold text-emerald-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadCloud size={16} className={updating ? 'animate-bounce' : ''} />
              <span>{updating ? 'Обновление...' : 'Обновить (Modrinth)'}</span>
            </button>
            <button onClick={() => handleScan('')} className="bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[11px] uppercase tracking-widest font-bold text-zinc-300 transition-all shadow-sm">
              <FolderOpen size={16} className="text-zinc-400" />
              <span>Папка Клиента</span>
            </button>
            <button onClick={() => handleScan('')} className="bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[11px] uppercase tracking-widest font-bold text-zinc-300 transition-all shadow-sm">
              <FolderOpen size={16} className="text-zinc-400" />
              <span>Папка Сервера</span>
            </button>
          </div>
        </div>

        {/* View Modes & Search */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex bg-zinc-900/50 rounded-xl border border-zinc-800/60 p-1.5 shadow-inner">
            <ViewBtn active={viewMode === 'client'} onClick={() => setViewMode('client')} label="Клиент" />
            <ViewBtn active={viewMode === 'server'} onClick={() => setViewMode('server')} label="Сервер" />
            <ViewBtn active={viewMode === 'both'} onClick={() => setViewMode('both')} label="Объединённый" />
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Поиск по базе..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-zinc-600 font-medium"
            />
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterTag active={fWorldgen} onClick={() => setFWorldgen(!fWorldgen)} label="Генерация" color="text-red-400" dotColor="bg-red-400" />
          <FilterTag active={fClient} onClick={() => setFClient(!fClient)} label="Клиент" color="text-blue-400" dotColor="bg-blue-400" />
          <FilterTag active={fServer} onClick={() => setFServer(!fServer)} label="Сервер" color="text-purple-400" dotColor="bg-purple-400" />
          <FilterTag active={fHeavy} onClick={() => setFHeavy(!fHeavy)} label="Тяжелые" color="text-amber-400" dotColor="bg-amber-400" />
          <FilterTag active={fLibrary} onClick={() => setFLibrary(!fLibrary)} label="Библиотеки" color="text-emerald-400" dotColor="bg-emerald-400" />
          <FilterTag active={fOpt} onClick={() => setFOpt(!fOpt)} label="Оптимизация" color="text-cyan-400" dotColor="bg-cyan-400" />
        </div>
      </div>

      {/* Mods Grid */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-none relative">
        {filteredMods.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center mb-6">
              <Package className="text-zinc-600" size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-zinc-300 mb-2">Пустой репозиторий</p>
            <p className="text-xs text-zinc-500 mb-6 max-w-sm">
              {loading ? 'Сканирование структуры файлов...' : 'Моды не найдены. Измените параметры фильтрации или выберите директорию с .jar файлами.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12">
            {filteredMods.map(mod => (
              <ModCard key={mod.path} mod={mod} onShowDeps={() => setSelectedMod(mod)} />
            ))}
          </div>
        )}
      </div>

      {selectedMod && (
        <DependencyTreeModal mod={selectedMod} allMods={mods} onClose={() => setSelectedMod(null)} />
      )}

      {showModrinthModal && (
        <ModrinthSearchModal onClose={() => setShowModrinthModal(false)} />
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all duration-200 ${
        active ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {label}
    </button>
  );
}

function FilterTag({ active, onClick, label, color, dotColor }: { active: boolean, onClick: () => void, label: string, color: string, dotColor: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-lg border transition-all duration-200 ${
        active 
          ? `bg-zinc-800/80 border-zinc-700 ${color}` 
          : `border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300`
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? dotColor : 'bg-zinc-700'}`}></span>
      {label}
    </button>
  );
}

const ModCard: React.FC<{ mod: ModInfo, onShowDeps: () => void }> = ({ mod, onShowDeps }) => {
  return (
    <div className="group rounded-3xl border border-zinc-800/40 bg-zinc-900/40 p-6 flex gap-5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-800/60 relative overflow-hidden backdrop-blur-md hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"></div>
      
      <div className="pt-2">
        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-zinc-700 bg-zinc-900 overflow-hidden cursor-pointer">
          <input type="checkbox" className="absolute opacity-0 w-full h-full cursor-pointer peer" />
          <div className="w-full h-full peer-checked:bg-blue-500 transition-colors"></div>
        </div>
      </div>
      
      <div className="w-16 h-16 bg-zinc-950 rounded-xl border border-zinc-800/80 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner p-1">
        {mod.icon_url ? <img src={mod.icon_url} alt="icon" className="w-full h-full object-contain rounded-lg" /> : <Package className="text-zinc-600" size={24} strokeWidth={1.5} />}
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-zinc-100 truncate pr-4 tracking-tight">{mod.display_name}</h3>
          <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
            {mod.api_source ? mod.api_source : 'Локальный'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 my-3">
          {mod.is_worldgen && <Badge label="Генерация" color="border-red-500/30 bg-red-500/10 text-red-400" />}
          {mod.is_client && <Badge label="Клиент" color="border-blue-500/30 bg-blue-500/10 text-blue-400" />}
          {mod.is_server && <Badge label="Сервер" color="border-purple-500/30 bg-purple-500/10 text-purple-400" />}
          {mod.is_heavy && <Badge label="Тяжелый" color="border-amber-500/30 bg-amber-500/10 text-amber-400" />}
          {mod.is_library && <Badge label="Core/API" color="border-emerald-500/30 bg-emerald-500/10 text-emerald-400" />}
          {mod.is_optimization && <Badge label="Опт" color="border-cyan-500/30 bg-cyan-500/10 text-cyan-400" />}
        </div>

        <p className="text-xs text-zinc-400 mb-5 line-clamp-2 leading-relaxed">
          {mod.description_ru || mod.description || 'Метаданные отсутствуют.'}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <div className="flex gap-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 cursor-pointer hover:text-amber-400 transition-colors" onClick={onShowDeps}>
              Зависит от: <span className="text-zinc-300">{mod.depends?.length || 0}</span>
            </span>
          </div>
          <button onClick={onShowDeps} className="text-[10px] uppercase tracking-widest font-bold text-blue-400 hover:text-blue-300 transition-colors">
            Граф зависимостей
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string, color: string }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${color}`}>
      {label}
    </span>
  );
}
