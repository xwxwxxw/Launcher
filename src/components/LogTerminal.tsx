import { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, FolderOpen, ExternalLink } from 'lucide-react';

export interface LogEntry {
  msg: string;
  time: string;
  type?: 'info' | 'warn' | 'error' | 'success';
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

  const processLog = (entry: LogEntry): { cleanMsg: string; time: string; type: 'info' | 'warn' | 'error' | 'success' } | null => {
    if (!entry || !entry.msg) return null;
    let raw = entry.msg.trim();

    // Remove [MCLC]: prefix
    if (raw.startsWith('[MCLC]:')) {
      raw = raw.replace(/^\[MCLC\]:\s*/, '').trim();
    }

    // Filter out internal low-level clutter
    if (
      raw.startsWith('MCLC version') ||
      raw.startsWith('Set global env var') ||
      raw.includes('Setting custom version file')
    ) {
      return null;
    }

    if (raw.startsWith('Detected custom in options')) {
      raw = 'Подготовка конфигурации версии...';
    } else if (raw.startsWith('Executing java')) {
      raw = 'Запуск процесса Java...';
    } else if (raw.startsWith('Set custom version file to')) {
      const ver = raw.replace('Set custom version file to', '').trim();
      raw = `Файл версии Minecraft: ${ver}`;
    }

    // Remove long path prefixes
    raw = raw.replace(/(?:\/[^\s\/]+)+(\/[^\s\/]+\.(?:jar|json|txt|png))/g, '$1');

    let logType = entry.type;
    if (!logType) {
      const lower = raw.toLowerCase();
      if (lower.includes('ошибка') || lower.includes('error') || lower.includes('failed') || lower.includes('critical') || lower.includes('[stderr]') || lower.includes('crash')) {
        logType = 'error';
      } else if (lower.includes('⚠️') || lower.includes('warning') || lower.includes('внимание') || lower.includes('пропущен') || lower.includes('[warn]')) {
        logType = 'warn';
      } else if (lower.includes('успешно') || lower.includes('success') || lower.includes('готов') || lower.includes('запущен') || lower.includes('найдена java') || lower.includes('подключен')) {
        logType = 'success';
      } else {
        logType = 'info';
      }
    }

    return { cleanMsg: raw, time: entry.time, type: logType };
  };

  const processedLogs = logs
    .map(processLog)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const handleCopyAll = async () => {
    if (!processedLogs || processedLogs.length === 0) return;
    const textToCopy = processedLogs
      .map(log => log.time ? `[${log.time}] [${log.type.toUpperCase()}] ${log.cleanMsg}` : log.cleanMsg)
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

  const renderBadge = (type: 'info' | 'warn' | 'error' | 'success') => {
    switch (type) {
      case 'error':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wide shrink-0">
            ОШИБКА
          </span>
        );
      case 'warn':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide shrink-0">
            ВНИМАНИЕ
          </span>
        );
      case 'success':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide shrink-0">
            УСПЕХ
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase tracking-wide shrink-0">
            ИНФО
          </span>
        );
    }
  };

  const getTextColor = (type: 'info' | 'warn' | 'error' | 'success') => {
    switch (type) {
      case 'error':
        return 'text-red-300 font-mono font-medium';
      case 'warn':
        return 'text-amber-300 font-mono font-medium';
      case 'success':
        return 'text-emerald-300 font-mono font-medium';
      case 'info':
      default:
        return 'text-zinc-200 font-mono';
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 select-none">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Terminal size={15} className="text-purple-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-200 tracking-wide truncate">{title}</span>
          {subtitle && (
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-md shrink-0 hidden sm:inline-block">
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
            disabled={!processedLogs || processedLogs.length === 0}
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
        style={{ fontFamily: '"JetBrains Mono", Consolas, "Courier New", Monaco, Menlo, monospace' }}
      >
        {(!processedLogs || processedLogs.length === 0) ? (
          <div className="h-full flex items-center justify-center text-zinc-600 font-mono italic text-xs select-none">
            Ожидание запуска операции...
          </div>
        ) : (
          processedLogs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 hover:bg-zinc-900/60 px-2 py-1 rounded-md transition-colors group select-text"
            >
              {log.time && (
                <span className="text-zinc-500 shrink-0 font-mono text-[11px] select-text pt-0.5">
                  [{log.time}]
                </span>
              )}
              {renderBadge(log.type)}
              <span className={`break-words select-text ${getTextColor(log.type)}`}>
                {log.cleanMsg}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
