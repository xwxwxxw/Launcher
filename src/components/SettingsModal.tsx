import { useState, useEffect } from 'react';
import { X, Folder, Monitor, Settings2, ShieldCheck, Gamepad2, Info, CheckCircle2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SettingsModalProps {
  onClose: () => void;
  gamePath: string;
  setGamePath: (p: string) => void;
}

export default function SettingsModal({ onClose, gamePath, setGamePath }: SettingsModalProps) {
  const [autostart, setAutostart] = useState(localStorage.getItem('launcher_autostart') === '1');
  const [minimizeTray, setMinimizeTray] = useState(localStorage.getItem('launcher_minimize_tray') === '1');
  const [language, setLanguage] = useState(localStorage.getItem('launcher_language') || 'ru');
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).require) {
      const { app } = (window as any).require('electron').remote || {};
      if (app) setVersion(app.getVersion());
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('launcher_autostart', autostart ? '1' : '0');
    localStorage.setItem('launcher_minimize_tray', minimizeTray ? '1' : '0');
    localStorage.setItem('launcher_language', language);
    localStorage.setItem('launcher_minecraft_path', gamePath);

    if (typeof window !== 'undefined' && (window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('set-autostart', autostart);
      ipcRenderer.invoke('set-minimize-to-tray', minimizeTray);
    }
    
    onClose();
  };

  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && (window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('select-directory', gamePath);
      if (result) setGamePath(result);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings2 className="text-zinc-400" size={20} />
            Настройки Лаунчера
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Основные</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-medium flex justify-between">
                <span>Папка игры (общая)</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={gamePath} 
                  onChange={(e) => setGamePath(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="./.minecraft"
                />
                <button 
                  onClick={handleSelectFolder}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
                >
                  <Folder size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-500">Эта папка используется для общих файлов. Моды хранятся в папках профилей.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-medium block">Язык интерфейса</label>
              <CustomSelect 
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'ru', label: 'Русский' },
                  { value: 'en', label: 'English' }
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Система</h3>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 rounded border border-zinc-700 bg-zinc-950 group-hover:border-blue-500 transition-colors">
                <input 
                  type="checkbox" 
                  checked={autostart} 
                  onChange={(e) => setAutostart(e.target.checked)}
                  className="absolute opacity-0 cursor-pointer" 
                />
                {autostart && <CheckCircle2 className="text-blue-500" size={14} />}
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Автозапуск с Windows</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 rounded border border-zinc-700 bg-zinc-950 group-hover:border-blue-500 transition-colors">
                <input 
                  type="checkbox" 
                  checked={minimizeTray} 
                  onChange={(e) => setMinimizeTray(e.target.checked)}
                  className="absolute opacity-0 cursor-pointer" 
                />
                {minimizeTray && <CheckCircle2 className="text-blue-500" size={14} />}
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Сворачивать в трей при закрытии</span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
