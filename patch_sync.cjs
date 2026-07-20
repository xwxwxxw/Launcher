const fs = require('fs');
let code = fs.readFileSync('src/components/SyncModal.tsx', 'utf8');

code = code.replace(
  "import { X, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ExternalLink, HardDrive } from 'lucide-react';",
  "import { X, CheckCircle2, Loader2, RefreshCw, AlertTriangle, ExternalLink, HardDrive, Minus, Maximize2 } from 'lucide-react';"
);

code = code.replace(
  "const logsEndRef = useRef<HTMLDivElement>(null);",
  "const logsEndRef = useRef<HTMLDivElement>(null);\n  const [isMinimized, setIsMinimized] = useState(false);"
);

const minimizedCode = `
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Loader2 size={16} className={status === 'syncing' ? 'animate-spin' : ''} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status === 'syncing' ? 'Синхронизация...' : status === 'success' ? 'Завершено' : status === 'error' ? 'Ошибка' : 'Обновление'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(false)} className="text-zinc-500 hover:text-white p-1 rounded-md transition-colors" title="Развернуть">
              <Maximize2 size={14} />
            </button>
            <button onClick={() => onClose(status === 'success')} disabled={status === 'syncing' || isLoggingIn} className="text-zinc-500 hover:text-white p-1 rounded-md disabled:opacity-50 transition-colors cursor-pointer" title="Закрыть">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="w-full mt-2">
          <div className="flex justify-between items-center mb-1 font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
            <span className="truncate pr-2">{status === 'error' ? errorMsg : (logs[logs.length-1]?.msg || 'Подключение...')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/20 shadow-inner">
            <div 
              className={\`h-full transition-all duration-300 rounded-full \${
                status === 'error' ? 'bg-red-500' : (status === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400')
              }\`}
              style={{ width: \`\${progress}%\` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
`;

code = code.replace(
  "return (\n    <div className=\"fixed inset-0",
  minimizedCode + "\n  return (\n    <div className=\"fixed inset-0"
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onClose\(status === 'success'\)\}\s+disabled=\{status === 'syncing' \|\| isLoggingIn\}\s+className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"\s*>\s*<X size=\{18\} \/>\s*<\/button>/,
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
              disabled={status === 'syncing' || isLoggingIn}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>`
);

fs.writeFileSync('src/components/SyncModal.tsx', code);
