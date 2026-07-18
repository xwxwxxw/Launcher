import { useState, useEffect } from 'react';
import { Profile } from '../types';
import { Plus, Edit, Trash2, Box, Download, Upload, Star } from 'lucide-react';
import CreateProfileModal from './CreateProfileModal';
import PlayerHead2D from './PlayerHead2D';
import { openFolderInExplorer } from '../utils/explorer';

const ForgeIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3" }) => (
  <svg className={`${className} text-amber-500`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 4h20v2.5l-3 3v2h2v4.5h-5v3H6v-3H1v-4.5h2v-2l-3-3V4zm5 3.5h10v-1H7v1zm2 5h6v-1H9v1z" />
  </svg>
);

const FabricIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3" }) => (
  <svg className={`${className} text-cyan-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0-9 9" />
    <path d="M19 17A9 9 0 0 0 9 7" />
    <path d="M21 12a9 9 0 0 0-9-9" />
    <path d="M15 21a9 9 0 0 0-9-9" />
    <path d="M12 21a9 9 0 0 0 9-9" />
  </svg>
);

const VanillaIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3" }) => (
  <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const getLoaderBadge = (loader: string) => {
  switch (loader) {
    case 'Fabric':
      return (
        <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-850 shadow-lg flex items-center justify-center" title="Fabric Loader">
          <FabricIcon />
        </div>
      );
    case 'Forge':
      return (
        <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-850 shadow-lg flex items-center justify-center" title="Forge Loader">
          <ForgeIcon />
        </div>
      );
    default:
      return (
        <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-850 shadow-lg flex items-center justify-center" title="Vanilla">
          <VanillaIcon />
        </div>
      );
  }
};

const getLoaderIcon = (loader: string, className = "w-6 h-6") => {
  switch (loader) {
    case 'Fabric':
      return <FabricIcon className={className} />;
    case 'Forge':
      return <ForgeIcon className={className} />;
    default:
      return <VanillaIcon className={className} />;
  }
};

interface ProfilesTabProps {
  profiles: Profile[];
  loading: boolean;
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (newProf: any) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onUpdateProfile: (id: string, updatedFields: any) => Promise<void>;
  mods: any[];
  userProfile: {name: string, id: string, accessToken: string} | null;
  onOpenModrinth?: () => void;
}

export default function ProfilesTab({
  profiles,
  loading,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onUpdateProfile,
  mods,
  userProfile,
  onOpenModrinth
}: ProfilesTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const handleCreate = async (newProf: any) => {
    await onCreateProfile(newProf);
    setShowCreate(false);
  };

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full">
      <div className="flex justify-end items-end mb-10 max-w-6xl gap-4">
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} /> Создать сборку
        </button>
        <button 
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e: any) => {
              const file = e.target.files[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              const mcPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';
              formData.append('minecraftPath', mcPath);
              const res = await fetch('/api/profiles/import', { method: 'POST', body: formData });
              if (res.ok) {
                window.location.reload();
              } else {
                const err = await res.json();
                alert(err.error || 'Ошибка импорта');
              }
            };
            input.click();
          }}
          className="ml-4 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Upload size={18} strokeWidth={2.5} /> Импорт
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
          profiles.map(p => {
            const profileMods = mods.filter(m => m.profile_id === p.id);
            const enabledCount = profileMods.filter(m => m.enabled !== false).length;
            const disabledCount = profileMods.filter(m => m.enabled === false).length;

            return (
              <ProfileCard 
                key={p.id} 
                profile={p} 
                isActive={p.id === activeProfileId}
                onSelect={() => onSelectProfile(p.id)}
                onDelete={() => onDeleteProfile(p.id)} 
                onEdit={() => setEditingProfile(p)}
                onToggleFavorite={() => onUpdateProfile(p.id, { is_favorite: !p.is_favorite })}
                enabledCount={enabledCount}
                disabledCount={disabledCount}
                userProfile={userProfile}
              />
            );
          })
        )}
      </div>

      {showCreate && <CreateProfileModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      
      {editingProfile && (
        <CreateProfileModal 
          onClose={() => setEditingProfile(null)} 
          onCreate={async (updatedFields) => {
            await onUpdateProfile(editingProfile.id, updatedFields);
            setEditingProfile(null);
          }} 
          initialData={editingProfile}
        />
      )}
    </div>
  );
}

const ProfileCard: React.FC<{ 
  profile: Profile, 
  isActive: boolean, 
  onSelect: () => void, 
  onDelete: () => void,
  onEdit: () => void,
  onToggleFavorite: () => void,
  enabledCount: number,
  disabledCount: number,
  userProfile: {name: string, id: string, accessToken: string} | null
}> = ({ profile, isActive, onSelect, onDelete, onEdit, onToggleFavorite, enabledCount, disabledCount, userProfile }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (confirmDelete) {
      const timer = setTimeout(() => setConfirmDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDelete]);

  return (
    <div 
      onClick={onSelect}
      className={`flex flex-col rounded-3xl border p-6 transition-all duration-300 backdrop-blur-md hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative group overflow-hidden cursor-pointer ${
        isActive 
          ? 'border-emerald-500/40 bg-zinc-900/70 hover:border-emerald-500/60 shadow-[0_4px_20px_rgba(16,185,129,0.05)]' 
          : 'border-zinc-800/40 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-800/60'
      }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] rounded-full pointer-events-none transition-colors ${
        isActive ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-blue-500/5 group-hover:bg-blue-500/10'
      }`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-inner flex items-center justify-center overflow-visible shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900">
              {getLoaderIcon(profile.mod_loader, "w-6 h-6")}
            </div>
            {userProfile ? (
              <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-850 shadow-lg flex items-center justify-center overflow-hidden animate-pulse" title={userProfile.name}>
                <PlayerHead2D username={userProfile.name} uuid={userProfile.id} className="w-4.5 h-4.5 scale-110" />
              </div>
            ) : (
              <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-850 shadow-lg flex items-center justify-center overflow-hidden" title="Steve">
                <PlayerHead2D username="Steve" uuid="" className="w-4.5 h-4.5 scale-110" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-zinc-100">{profile.name}</h3>
              {profile.is_github_sync && (
                <span className="text-[8px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  GitHub Sync
                </span>
              )}
              {isActive && (
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  Активен
                </span>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">
              {profile.mod_loader} {profile.game_version} • {enabledCount} акт. / {disabledCount} выкл.
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 items-center relative z-20">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onToggleFavorite();
            }} 
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              profile.is_favorite 
                ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10' 
                : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 opacity-0 group-hover:opacity-100'
            }`}
            title={profile.is_favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <Star size={14} fill={profile.is_favorite ? "currentColor" : "none"} />
          </button>

          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 items-center">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const mcPath = localStorage.getItem('launcher_minecraft_path') || './.minecraft';
                window.open(`/api/profiles/${profile.id}/export?minecraftPath=${encodeURIComponent(mcPath)}`, '_blank'); 
              }} 
              className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
              title="Экспорт сборки (ZIP)"
            >
              <Download size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
              title="Редактировать сборку"
            >
              <Edit size={14} />
            </button>
            
            {confirmDelete ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); setConfirmDelete(false); }} 
                className="px-2.5 py-1 bg-red-500/25 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/40 rounded-lg transition-all animate-pulse"
                title="Нажмите еще раз для подтверждения"
              >
                Удалить?
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} 
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                title="Удалить сборку"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <p className="text-xs text-zinc-400 mb-6 line-clamp-2 leading-relaxed relative z-10">{profile.description}</p>
      
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/50 p-4 mt-auto mb-4 relative z-10">
        <div className="flex justify-between items-center mb-2">
           <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">RAM Allotment</p>
           <span className="text-[10px] font-mono text-zinc-300 font-bold">{profile.ram_mb} MB</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden mb-3">
          <div className="h-full rounded-full bg-blue-500/80" style={{ width: `${Math.min(100, (profile.ram_mb / 16384) * 100)}%` }}></div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800/50">
          <button 
            onClick={(e) => { e.stopPropagation(); openFolderInExplorer(profile.mod_path); }}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[9px] uppercase tracking-widest font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            title="Открыть папку модов"
          >
            Папка модов
          </button>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`w-full flex h-11 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative z-10 ${
          isActive 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 cursor-default' 
            : 'bg-zinc-800 text-zinc-200 hover:bg-white hover:text-black'
        }`}
      >
        {isActive ? 'Сборка выбрана' : 'Выбрать сборку'}
      </button>
    </div>
  );
}
