const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const githubBannerCode = `
        {/* Banner Alert for Github update */}
        {githubUpdateAvailable && activeProfile && (activeProfile.syncSource === 'github' || activeProfile.is_github_sync || activeProfile.id === 'GDSync') && (
          <div className="bg-gradient-to-r from-emerald-950/60 to-green-950/60 border-b border-emerald-500/30 px-8 py-3 flex items-center justify-between animate-fade-in relative z-20">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-100">Доступно обновление сборки "{activeProfile.name}" в GitHub!</p>
                <p className="text-[10px] text-zinc-400">В репозитории обнаружены изменения. Обновите сборку, чтобы применить новые моды и настройки.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                Обновить сейчас
              </button>
            </div>
          </div>
        )}
`;

code = code.replace("{/* Banner Alert for GDrive update */}", githubBannerCode + "        {/* Banner Alert for GDrive update */}");

fs.writeFileSync('src/App.tsx', code);
