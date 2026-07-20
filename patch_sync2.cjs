const fs = require('fs');
let code = fs.readFileSync('src/components/SyncModal.tsx', 'utf8');

code = code.replace(
  /<button \n            onClick=\{\(\) => onClose\(status === 'success'\)\}\n            className="text-zinc-500 hover:text-zinc-300 p-1\.5 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"\n            title=\{status === 'syncing' \? "Принудительно остановить и закрыть" : "Закрыть"\}\n          >\n            <X size=\{18\} \/>\n          <\/button>/,
  `<div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer"
              title="Свернуть"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={() => onClose(status === 'success')}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
              title={status === 'syncing' ? "Принудительно остановить и закрыть" : "Закрыть"}
            >
              <X size={18} />
            </button>
          </div>`
);

fs.writeFileSync('src/components/SyncModal.tsx', code);
