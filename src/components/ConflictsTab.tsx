import { ShieldAlert, AlertTriangle, AlertCircle, XCircle, X } from 'lucide-react';

interface Conflict {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  payload?: any;
}

interface ConflictsTabProps {
  conflicts: Conflict[];
  onResolveConflict: (actionType: string, payload?: any) => void;
  onDismissConflict: (id: string) => void;
}

export default function ConflictsTab({ conflicts, onResolveConflict, onDismissConflict }: ConflictsTabProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="text-red-500" size={24} />;
      case 'high': return <AlertTriangle className="text-amber-500" size={24} />;
      case 'low': return <AlertCircle className="text-blue-500" size={24} />;
      default: return <ShieldAlert className="text-zinc-500" size={24} />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/20 backdrop-blur-md shadow-lg shadow-red-900/10';
      case 'high': return 'bg-amber-500/10 border-amber-500/20 backdrop-blur-md shadow-lg shadow-amber-900/10';
      case 'low': return 'bg-blue-500/10 border-blue-500/20 backdrop-blur-md shadow-lg shadow-blue-900/10';
      default: return 'bg-zinc-800/40 border-zinc-700/50 backdrop-blur-md shadow-lg';
    }
  };

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full relative">
      <div className="space-y-4 w-full">
        {conflicts.map(conflict => (
          <div key={conflict.id} className={`p-6 rounded-3xl border flex gap-5 items-start transition-all hover:scale-[1.01] relative group ${getSeverityClass(conflict.severity)}`}>
            
            {/* Dismiss / Delete button */}
            <button 
              onClick={() => onDismissConflict(conflict.id)}
              title="Игнорировать эту проблему"
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800/50 text-zinc-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={14} />
            </button>

            <div className="pt-1">
              {getSeverityIcon(conflict.severity)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 pr-8">
                <h3 className="text-base font-bold text-zinc-100">{conflict.title}</h3>
                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                  conflict.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  conflict.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {conflict.severity === 'critical' ? 'Критично' : conflict.severity === 'high' ? 'Высокий' : 'Информация'}
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{conflict.description}</p>
              
              <div className="flex gap-3">
                {conflict.type === 'missing_dependency' && (
                  <button 
                    onClick={() => onResolveConflict('install_dep', 'P7dR8mSH')} // Fabric API Modrinth project ID
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Установить Fabric API
                  </button>
                )}
                {conflict.type === 'missing_dependency_auto' && conflict.payload && (
                  <button 
                    onClick={() => onResolveConflict('install_auto_dep', conflict.payload)}
                    className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Установить {conflict.payload.dependencyName}
                  </button>
                )}
                {conflict.type === 'conflict' && (
                  <button 
                    onClick={() => onResolveConflict('remove_optifine', 'optifine')}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Удалить OptiFine
                  </button>
                )}
                <button 
                  onClick={() => onDismissConflict(conflict.id)}
                  className="bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-lg text-xs font-bold transition-all text-zinc-400 hover:text-zinc-200 shadow-sm"
                >
                  Игнорировать
                </button>
              </div>
            </div>
          </div>
        ))}

        {conflicts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
            <ShieldAlert size={48} className="text-emerald-500/50 mb-4" />
            <h3 className="text-lg font-bold text-zinc-300">Всё отлично!</h3>
            <p className="text-sm text-zinc-500 text-center max-w-sm mt-2">
              В текущей сборке не найдено никаких проблем, конфликтов или отсутствующих зависимостей.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
