const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

const targetProps = `  ram: number,
  activeProfileName: string
}) {`;

const repProps = `  ram: number,
  activeProfileName: string,
  activeProfile?: any
}) {`;

code = code.replace(targetProps, repProps);

const statsHtml = `
          {activeProfile && activeProfile.stats && (
            <div className="mt-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 w-full">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Статистика профиля</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Сыграно времени</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    {Math.floor(activeProfile.stats.totalPlayTimeMs / 3600000)}ч {Math.floor((activeProfile.stats.totalPlayTimeMs % 3600000) / 60000)}м
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Последний запуск</span>
                  <span className="text-blue-400 font-medium">
                    {activeProfile.stats.lastLaunchTime > 0 ? new Date(activeProfile.stats.lastLaunchTime).toLocaleString() : 'Никогда'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Всего запусков</span>
                  <span className="text-purple-400 font-mono font-medium">{activeProfile.stats.launchCount}</span>
                </div>
              </div>
            </div>
          )}
`;

const userProfileTarget = `<h3 className="text-xl font-bold tracking-wide text-zinc-100">{userProfile.name}</h3>
            </div>`;
const userProfileRep = `<h3 className="text-xl font-bold tracking-wide text-zinc-100">{userProfile.name}</h3>
            </div>
            ` + statsHtml;

code = code.replace(userProfileTarget, userProfileRep);
fs.writeFileSync('src/components/HomeTab.tsx', code);
