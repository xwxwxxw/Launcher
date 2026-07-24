import { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, FolderOpen, ExternalLink } from 'lucide-react';

export interface LogEntry {
  msg: string;
  time: string;
}

interface LogTerminalProps {
  logs: LogEntry[];
  title?: string;
  subtitle?: string;
  profileId?: string;
  minecraftPath?: string;
  heightClass?: string;
  onOpenLogFile?: () => void;
  showOpenLogButton?: boolean;
}

export default function LogTerminal({
  logs,
  title = 'Лог операций',
  subtitle = 'UTC Terminal',
  profileId = '1',
  minecraftPath = '',
  heightClass = 'h-72 min-h-[240px]',
  onOpenLogFile,
  showOpenLogButton = true
}: LogTerminalProps) {
  const [copied, setCopied] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyAll = async () => {
    if (!logs || logs.length === 0) return;
    const textToCopy = logs
      .map(log => log.time ? `[${log.time}] ${log.msg}` : log.msg)
      .join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const handleOpenFolder = async () => {
    if (onOpenLogFile) {
      onOpenLogFile();
      return;
    }

    setOpeningFolder(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electron) {
        const { ipcRenderer } = (window as any).electron;
        await ipcRenderer.invoke('open-path', `./profiles/${profileId}/logs`);
      } else {
        await fetch(`/api/minecraft/open-logs-folder?profileId=${profileId}&minecraftPath=${encodeURIComponent(minecraftPath)}`, {
          method: 'POST'
        });
      }
    } catch (e) {
      console.error('Failed to open logs folder:', e);
    } finally {
      setTimeout(() => setOpeningFolder(false), 1000);
    }
  };

  const getLogColor = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('ошибка') || lower.includes('error') || lower.includes('failed') || lower.includes('critical')) {
      return 'text-red-400 font-medium bg-red-500/10 px-1 py-0.5 rounded';
    }
    if (lower.includes('успешно') || lower.includes('success') || lower.includes('завершен') || lower.includes('актуален')) {
      return 'text-emerald-400 font-medium';
    }
    if (lower.includes('⚠️') || lower.includes('warning') || lower.includes('внимание') || lower.includes('пропущен')) {
      return 'text-amber-300';
    }
    return 'text-zinc-300';
  };

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800/60 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-600/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/50" />
          </div>
          <Terminal size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-zinc-300 tracking-wide">{title}</span>
          {subtitle && (
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
              {subtitle}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {showOpenLogButton && (
            <button
              onClick={handleOpenFolder}
              disabled={openingFolder}
              title="Открыть файл логов в системе"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700/90 hover:text-white border border-zinc-700/60 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderOpen size={13} className="text-purple-400" />
              <span className="hidden sm:inline">Файл логов</span>
            </button>
          )}

          <button
            onClick={handleCopyAll}
            disabled={!logs || logs.length === 0}
            title="Скопировать весь лог в буфер обмена"
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30'
            }`}
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span>Скопировано!</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-purple-400" />
                <span>Скопировать всё</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Log Output Window */}
      <div
        ref={scrollRef}
        className={`${heightClass} overflow-y-auto p-4 font-mono text-[12px] leading-relaxed select-text cursor-text bg-[#09090b] space-y-1.5 custom-scrollbar`}
        style={{ fontFamily: 'Consolas, "Courier New", Monaco, Menlo, monospace' }}
      >
        {(!logs || logs.length === 0) ? (
          <div className="h-full flex items-center justify-center text-zinc-600 font-mono italic text-xs select-none">
            Ожидание запуска операции...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 hover:bg-zinc-900/40 px-1.5 py-0.5 rounded transition-colors group select-text"
            >
              {log.time && (
                <span className="text-zinc-500 shrink-0 font-mono text-[11px] select-text pt-0.5">
                  [{log.time}]
                </span>
              )}
              <span className={`break-words select-text ${getLogColor(log.msg)}`}>
                {log.msg}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
