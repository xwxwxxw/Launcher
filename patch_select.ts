import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            <div className="flex items-center gap-2">
              <select 
                value={activeProfile.id}
                onChange={(e) => handleSelectProfile(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl px-3 py-2 outline-none w-32 appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
                title="Сборка"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>`;

const replacement = `            <div className="flex items-center gap-3">
              <div className="relative group">
                <select 
                  value={activeProfile.id}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-200 text-sm font-semibold rounded-xl pl-4 pr-10 h-12 outline-none appearance-none cursor-pointer transition-all shadow-inner backdrop-blur-md min-w-[160px] truncate"
                  title="Выбор сборки"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <ChevronDown size={18} />
                </div>
              </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
