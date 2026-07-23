import { useState, useEffect, useRef } from 'react';
import { Terminal, FolderOpen, RefreshCw, AlertTriangle } from 'lucide-react';
import { openFolderInExplorer } from '../utils/explorer';

export default function LogsTab({ activeProfileId, globalGamePath }: { activeProfileId: string, globalGamePath: string }) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/minecraft/logs?profileId=${activeProfileId}&minecraftPath=${encodeURIComponent(globalGamePath)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.content || 'Логи пусты.');
        setError('');
      } else {
        const err = await res.json();
        setError(err.error || 'Не удалось прочитать логи');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [activeProfileId, globalGamePath]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleOpenFolder = async () => {
    try {
      await fetch(`/api/minecraft/open-logs-folder?profileId=${activeProfileId}&minecraftPath=${encodeURIComponent(globalGamePath)}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to open logs folder:', e);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Terminal className="text-purple-500" size={28} />
            Логи игры
          </h2>
          <p className="text-zinc-400 mt-1">latest.log и crash-reports</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700/50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button 
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl transition-colors border border-purple-500/20"
          >
            <FolderOpen size={16} />
            Открыть папку
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle size={32} className="text-red-400 mb-3" />
          <h3 className="text-red-400 font-medium">{error}</h3>
          <p className="text-red-400/70 text-sm mt-1">Убедитесь, что игра была запущена хотя бы один раз.</p>
        </div>
      ) : (
        <div className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-xl p-4 overflow-auto font-mono text-xs whitespace-pre-wrap text-zinc-300 custom-scrollbar relative">
          {logs}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
