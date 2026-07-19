import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Folder, FolderOpen, Cpu, HelpCircle, ChevronDown, Cloud, HardDrive, Globe } from 'lucide-react';
import { Profile } from '../types';
import { openFolderInExplorer } from '../utils/explorer';

export default function CreateProfileModal({ 
  onClose, 
  onCreate, 
  initialData 
}: { 
  onClose: () => void, 
  onCreate: (p: any) => void, 
  initialData?: any 
}) {
  const [name, setName] = useState(initialData?.name || 'Новая сборка');
  const [version, setVersion] = useState(initialData?.game_version || '1.20.1');
  const [versions, setVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  
  // Custom mod loader, mod path, and RAM
  const [modLoader, setModLoader] = useState<'Vanilla' | 'Fabric' | 'Forge'>(initialData?.mod_loader || 'Fabric');
  const [useSeparateFolder, setUseSeparateFolder] = useState(!!initialData?.mod_path);
  const [customPath, setCustomPath] = useState(initialData?.mod_path || '');
  const [ramMb, setRamMb] = useState<number>(initialData?.ram_mb || 4096);
  
  // Sync states
  const [isSyncEnabled, setIsSyncEnabled] = useState(!!initialData?.is_github_sync || initialData?.syncSource === 'gdrive');
  const [syncSource, setSyncSource] = useState<'github' | 'gdrive'>(initialData?.syncSource || (initialData?.is_github_sync ? 'github' : 'github'));
  const [gdriveInput, setGdriveInput] = useState(initialData?.gdriveFolderId || '');

  const extractFolderId = (input: string) => {
    const match = input.match(/folders\/([a-zA-Z0-9-_]{25,50})/);
    return match ? match[1] : input.trim();
  };
  
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showLoaderDropdown, setShowLoaderDropdown] = useState(false);
  
  const customPathInputRef = useRef<HTMLInputElement>(null);

  const handleCustomPathBrowse = async () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        const { ipcRenderer } = (window as any).electron;
        const selected = await ipcRenderer.invoke('select-directory', customPath);
        if (selected) {
          setCustomPath(selected);
        }
        return;
      } catch (e) {
        console.error('Failed to open Electron directory dialog:', e);
      }
    }
    customPathInputRef.current?.click();
  };

  const handleCustomFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath || '';
      const folderName = relativePath.split('/')[0] || 'custom_profile';
      setCustomPath(`./profiles/${folderName}`);
    }
  };

  useEffect(() => {
    fetch('/api/minecraft/versions')
      .then(res => res.json())
      .then(data => {
        const releases = data.versions.filter((v: any) => v.type === 'release').map((v: any) => v.id);
        setVersions(releases);
        if (releases.length > 0 && !releases.includes(version)) {
          setVersion(releases[0]);
        }
        setLoadingVersions(false)
      })
      .catch(err => {
        console.error(err);
        setVersions(['1.20.1', '1.19.4', '1.18.2', '1.16.5']);
        setLoadingVersions(false);
      });
  }, []);

  // Automatically update the default custom directory path if toggled and empty
  useEffect(() => {
    if (useSeparateFolder && !customPath && name) {
      const folderFriendlyName = name.toLowerCase()
        .replace(/[^a-z0-9а-яё\-]/g, '_')
        .replace(/_+/g, '_')
        .trim();
      setCustomPath(`./profiles/${folderFriendlyName || 'build'}`);
    } else if (!useSeparateFolder) {
      setCustomPath('');
    }
  }, [useSeparateFolder, name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const folderId = extractFolderId(gdriveInput);
    onCreate({
      ...initialData,
      name,
      description: `Пользовательская сборка ${version} на ${modLoader}`,
      game_version: version,
      mod_loader: modLoader,
      mod_path: useSeparateFolder ? customPath : '',
      is_active: initialData?.is_active || false,
      ram_mb: ramMb,
      is_github_sync: isSyncEnabled && syncSource === 'github',
      syncSource: isSyncEnabled ? syncSource : undefined,
      gdriveFolderId: isSyncEnabled && syncSource === 'gdrive' ? folderId : undefined,
      gdriveFolderName: isSyncEnabled && syncSource === 'gdrive' ? 'Google Drive Folder' : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 relative z-10">
          <h2 className="text-lg font-bold text-white">
            {initialData ? 'Редактировать сборку' : 'Создать новую сборку'}
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 relative z-10 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          
          {/* Build Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Название сборки</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
              placeholder="Например: Мой выживач"
            />
          </div>

          {/* Game version and Mod Loader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 flex items-center gap-2">
                Версия игры
                {loadingVersions && <Loader2 size={12} className="animate-spin text-blue-400" />}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowVersionDropdown(!showVersionDropdown);
                    setShowLoaderDropdown(false);
                  }}
                  disabled={loadingVersions}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50 select-none text-left h-11"
                >
                  <span className="truncate">{version}</span>
                  <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${showVersionDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                
                {showVersionDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowVersionDropdown(false)} />
                    <div className="absolute top-full mt-1.5 left-0 w-full bg-zinc-950/95 border border-zinc-850 backdrop-blur-xl rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5 max-h-[160px] overflow-y-auto">
                      {versions.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setVersion(v);
                            setShowVersionDropdown(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all ${
                            v === version 
                              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                              : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Мод-Лоадер</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoaderDropdown(!showLoaderDropdown);
                    setShowVersionDropdown(false);
                  }}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors flex items-center justify-between gap-2 cursor-pointer select-none text-left h-11"
                >
                  <span className="truncate">
                    {modLoader === 'Fabric' ? 'Fabric (Рекомендуется)' : modLoader === 'Forge' ? 'Forge' : 'Vanilla (Чистый клиент)'}
                  </span>
                  <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${showLoaderDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                
                {showLoaderDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLoaderDropdown(false)} />
                    <div className="absolute top-full mt-1.5 left-0 w-full bg-zinc-950/95 border border-zinc-850 backdrop-blur-xl rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5">
                      {[
                        { id: 'Fabric', label: 'Fabric (Рекомендуется)' },
                        { id: 'Forge', label: 'Forge' },
                        { id: 'Vanilla', label: 'Vanilla (Чистый клиент)' }
                      ].map(loader => (
                        <button
                          key={loader.id}
                          type="button"
                          onClick={() => {
                            setModLoader(loader.id as any);
                            setShowLoaderDropdown(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all ${
                            loader.id === modLoader 
                              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                              : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {loader.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Separate Folder / Directory Isolation */}
          <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Folder size={18} className="text-zinc-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Изоляция директории (Legacy-стиль)</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Создать сборку в независимой изолированной папке.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={useSeparateFolder}
                  onChange={(e) => setUseSeparateFolder(e.target.checked)}
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            {useSeparateFolder && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500">Путь к папке сборки</label>
                <div className="flex gap-2.5">
                  <input 
                    type="text" 
                    value={customPath}
                    onChange={e => setCustomPath(e.target.value)}
                    placeholder="Путь к независимой папке..."
                    className="flex-1 bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    required={useSeparateFolder}
                  />
                  <input 
                    type="file"
                    ref={customPathInputRef}
                    style={{ display: 'none' }}
                    {...{ webkitdirectory: "", directory: "" }}
                    onChange={handleCustomFolderSelect}
                  />
                  <button 
                    type="button"
                    onClick={handleCustomPathBrowse}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 border border-zinc-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Обзор...
                  </button>
                  <button 
                    type="button"
                    onClick={() => openFolderInExplorer(customPath)}
                    className="bg-zinc-900 hover:bg-zinc-850 hover:text-white px-3 py-2.5 border border-zinc-800 rounded-xl text-zinc-400 transition-colors flex items-center justify-center"
                    title="Открыть в проводнике Windows"
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  По умолчанию будет создана папка <code className="text-blue-400 font-mono">{customPath}</code> в корне лаунчера. Все моды этой сборки будут находиться в ней изолированно.
                </p>
              </div>
            )}
          </div>

          {/* Network Sync Section */}
          <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Cloud size={18} className="text-zinc-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Сетевая синхронизация сборки</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Автоматическое скачивание и обновление модов из сети.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isSyncEnabled}
                  onChange={(e) => setIsSyncEnabled(e.target.checked)}
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            {isSyncEnabled && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Источник синхронизации</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncSource('github')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        syncSource === 'github'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Globe size={14} />
                      GitHub Релиз
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncSource('gdrive')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        syncSource === 'gdrive'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <HardDrive size={14} />
                      Google Диск
                    </button>
                  </div>
                </div>

                {syncSource === 'github' ? (
                  <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850/50">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Сборка будет автоматически синхронизироваться со встроенным GitHub репозиторием. Все новые моды будут загружены во время обновления.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500">Ссылка на папку Google Диска или её ID</label>
                    <input 
                      type="text" 
                      value={gdriveInput}
                      onChange={e => setGdriveInput(e.target.value)}
                      placeholder="Вставьте ссылку или ID папки..."
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      required={syncSource === 'gdrive'}
                    />
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Убедитесь, что папка на Google Диске доступна для чтения (доступ по ссылке). При обновлении сборка скачает все jar-файлы из указанной папки.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RAM Allotment Slider */}
          <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Cpu size={18} className="text-zinc-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Выделение ОЗУ для сборки</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Ограничить ОЗУ персонально для данного профиля.</p>
                </div>
              </div>
              <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-xs font-bold font-mono text-zinc-300">
                {ramMb} MB
              </span>
            </div>

            <input 
              type="range" 
              min="1024" 
              max="16384" 
              step="512" 
              value={ramMb}
              onChange={(e) => setRamMb(Number(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.01] active:scale-[0.99]">
              {initialData ? 'Обновить сборку' : 'Создать сборку'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
