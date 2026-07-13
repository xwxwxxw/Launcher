const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<span className="text-xl font-bold tracking-tight text-white">Layle Launcher</span>`;
const replacement = `<span className="text-xl font-bold tracking-tight text-white">Layle Launcher</span>
            <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md shadow-inner">
              v{launcherVersion || '0.0.4'}
            </span>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
