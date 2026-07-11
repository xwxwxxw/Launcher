import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { Play, Plus, Edit, Trash2, Box } from 'lucide-react';
import CreateProfileModal from './CreateProfileModal';

export default function ProfilesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        setLoading(false);
      });
  }, []);

  const handleCreate = (newProf: any) => {
    fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProf)
    }).then(res => res.json()).then(p => {
      setProfiles([...profiles, p]);
      setShowCreate(false);
    });
  };

  const handleDelete = (id: string) => {
    fetch(`/api/profiles/${id}`, { method: 'DELETE' })
      .then(() => setProfiles(profiles.filter(p => p.id !== id)));
  };

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full">
      <div className="flex justify-end items-end mb-10 max-w-6xl">
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} /> Создать сборку
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mb-4"></div>
            <p className="text-xs uppercase tracking-widest font-bold">Синхронизация профилей</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center mb-6">
              <Box className="text-zinc-600" size={32} />
            </div>
            <p className="text-sm font-semibold text-zinc-300 mb-2">Нет сохраненных сборок</p>
            <p className="text-xs text-zinc-500 mb-6 max-w-xs text-center">
              Создайте первый профиль для запуска игры, настройки модов и выделения оперативной памяти.
            </p>
            <button onClick={() => setShowCreate(true)} className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">
              + Добавить профиль
            </button>
          </div>
        ) : (
          profiles.map(p => (
            <ProfileCard key={p.id} profile={p} onDelete={() => handleDelete(p.id)} />
          ))
        )}
      </div>

      {showCreate && <CreateProfileModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}

const ProfileCard: React.FC<{ profile: Profile, onDelete: () => void }> = ({ profile, onDelete }) => {
  return (
    <div className="flex flex-col rounded-3xl border border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-800/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-inner flex items-center justify-center">
             <img src="https://minecraft.wiki/images/Grass_Block_Revision_6.png" className="w-6 h-6 object-contain opacity-80 mix-blend-luminosity group-hover:mix-blend-normal transition-all" alt="Grass" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">{profile.name}</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">{profile.mod_loader} {profile.game_version}</p>
          </div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
          <button className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"><Edit size={14} /></button>
          <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <p className="text-xs text-zinc-400 mb-6 line-clamp-2 leading-relaxed relative z-10">{profile.description}</p>
      
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/50 p-4 mt-auto mb-5 relative z-10">
        <div className="flex justify-between items-center mb-2">
           <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">RAM Allotment</p>
           <span className="text-[10px] font-mono text-zinc-300 font-bold">{profile.ram_mb} MB</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
          <div className="h-full rounded-full bg-blue-500/80" style={{ width: `${Math.min(100, (profile.ram_mb / 16384) * 100)}%` }}></div>
        </div>
      </div>

      <button className="w-full flex h-11 items-center justify-center rounded-xl bg-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-200 hover:bg-white hover:text-black transition-all relative z-10">
        Выбрать профиль
      </button>
    </div>
  );
}
