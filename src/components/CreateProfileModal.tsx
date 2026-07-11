import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Profile } from '../types';

export default function CreateProfileModal({ onClose, onCreate, initialData }: { onClose: () => void, onCreate: (p: any) => void, initialData?: any }) {
  const [name, setName] = useState(initialData?.name || 'Новая сборка');
  const [version, setVersion] = useState(initialData?.game_version || '1.20.1');
  const [versions, setVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);

  useEffect(() => {
    fetch('/api/minecraft/versions')
      .then(res => res.json())
      .then(data => {
        const releases = data.versions.filter((v: any) => v.type === 'release').map((v: any) => v.id);
        setVersions(releases);
        if (releases.length > 0 && !releases.includes(version)) {
          setVersion(releases[0]);
        }
        setLoadingVersions(false);
      })
      .catch(err => {
        console.error(err);
        setVersions(['1.20.1', '1.19.4', '1.18.2']);
        setLoadingVersions(false);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...initialData,
      name,
      description: 'Пользовательская сборка ' + version,
      game_version: version,
      mod_loader: initialData?.mod_loader || 'Fabric',
      mod_path: initialData?.mod_path || '',
      is_active: initialData?.is_active || false,
      ram_mb: initialData?.ram_mb || 4096
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 relative z-10">
          <h2 className="text-lg font-bold text-white">Создать сборку</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 relative z-10 flex flex-col gap-5">
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Название сборки</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 flex items-center gap-2">
              Версия игры (Официальный манифест)
              {loadingVersions && <Loader2 size={12} className="animate-spin text-blue-400" />}
            </label>
            <select 
              value={version}
              onChange={e => setVersion(e.target.value)}
              disabled={loadingVersions}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
            >
              {versions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]">
              Сохранить профиль
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
