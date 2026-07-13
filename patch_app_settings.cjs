const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import LauncherSplashScreen from './components/LauncherSplashScreen';`;
const importRep = `import LauncherSplashScreen from './components/LauncherSplashScreen';
import SettingsModal from './components/SettingsModal';
import LogsTab from './components/LogsTab';
import ScreenshotsTab from './components/ScreenshotsTab';`;
code = code.replace(importTarget, importRep);

const stateTarget = `  const [isCheckingInstall, setIsCheckingInstall] = useState(false);`;
const stateRep = `  const [isCheckingInstall, setIsCheckingInstall] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalGamePath, setGlobalGamePath] = useState(localStorage.getItem('launcher_minecraft_path') || './.minecraft');
  const [launcherVersion, setLauncherVersion] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).require) {
      const { app } = (window as any).require('electron').remote || {};
      if (app) setLauncherVersion(app.getVersion());
    }
  }, []);`;
code = code.replace(stateTarget, stateRep);

const iconTarget = `import { Package, FolderTree, Settings, PlaySquare, User, ShieldAlert, ChevronDown } from 'lucide-react';`;
const iconRep = `import { Package, FolderTree, Settings, PlaySquare, User, ShieldAlert, ChevronDown, FileText, Image as ImageIcon, Settings2 } from 'lucide-react';`;
code = code.replace(iconTarget, iconRep);

const navTarget = `              <button 
                onClick={() => setActiveTab('settings')}`;
const navRep = `              <button 
                onClick={() => setActiveTab('logs' as any)}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 \${
                  activeTab === 'logs' as any 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                }\`}
              >
                <FileText size={20} className={activeTab === 'logs' as any ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''} />
                <span>Логи игры</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('screenshots' as any)}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 \${
                  activeTab === 'screenshots' as any 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-900/20' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                }\`}
              >
                <ImageIcon size={20} className={activeTab === 'screenshots' as any ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''} />
                <span>Скриншоты</span>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}`;
code = code.replace(navTarget, navRep);

const modalTarget = `      <UpdateModal />`;
const modalRep = `      <UpdateModal />
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          gamePath={globalGamePath}
          setGamePath={setGlobalGamePath}
        />
      )}`;
code = code.replace(modalTarget, modalRep);

const tabViewTarget = `          {activeTab === 'settings' && (`;
const tabViewRep = `          {(activeTab as any) === 'logs' && (
            <LogsTab activeProfileId={activeProfileId} />
          )}
          {(activeTab as any) === 'screenshots' && (
            <ScreenshotsTab activeProfileId={activeProfileId} globalGamePath={globalGamePath} />
          )}
          {activeTab === 'settings' && (`;
code = code.replace(tabViewTarget, tabViewRep);

const footerTarget = `          {/* Player Auth area */}`;
const footerRep = `          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-300 text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent mb-4"
          >
            <div className="flex items-center gap-3">
              <Settings2 size={20} />
              <span>Настройки лаунчера</span>
            </div>
          </button>

          {/* Player Auth area */}`;
code = code.replace(footerTarget, footerRep);

const versionTarget = `                    <div className="text-xs text-zinc-500">{activeProfile.mod_loader} {activeProfile.mod_loader_version}</div>
                  </div>`;
const versionRep = `                    <div className="text-xs text-zinc-500">{activeProfile.mod_loader} {activeProfile.mod_loader_version}</div>
                  </div>
                  <div className="px-3 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Версия Лаунчера</div>
                    <div className="text-xs text-zinc-400 font-mono">v{launcherVersion || '0.0.4'}</div>
                  </div>`;
code = code.replace(versionTarget, versionRep);

fs.writeFileSync('src/App.tsx', code);
