import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

export default function ConflictsTab() {
  // Mock conflicts data
  const conflicts = [
    {
      id: '1',
      type: 'missing_dependency',
      title: 'Отсутствует зависимость: Fabric API',
      description: 'Для работы мода "Sodium" требуется Fabric API версии 0.90.0 или выше.',
      severity: 'high'
    },
    {
      id: '2',
      type: 'conflict',
      title: 'Конфликт модов',
      description: 'Мод "OptiFine" конфликтует с "Sodium". Пожалуйста, удалите один из них для стабильной работы сборки.',
      severity: 'critical'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Устаревшая версия мода',
      description: 'Доступна новая версия для "Iris Shaders" (1.6.17 -> 1.7.0).',
      severity: 'low'
    }
  ];

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
      case 'critical': return 'bg-red-500/10 border-red-500/20';
      case 'high': return 'bg-amber-500/10 border-amber-500/20';
      case 'low': return 'bg-blue-500/10 border-blue-500/20';
      default: return 'bg-zinc-800/40 border-zinc-700/50';
    }
  };

  return (
    <div className="flex-1 px-10 py-12 overflow-y-auto w-full h-full relative">
      <div className="mb-10 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Проблемы и конфликты</h2>
        <p className="text-sm text-zinc-400">Панель управления несовместимостями, ошибками и отсутствующими зависимостями.</p>
      </div>

      <div className="space-y-4 max-w-4xl">
        {conflicts.map(conflict => (
          <div key={conflict.id} className={`p-6 rounded-2xl border flex gap-5 items-start ${getSeverityClass(conflict.severity)}`}>
            <div className="pt-1">
              {getSeverityIcon(conflict.severity)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
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
                <button className="bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 px-4 py-2 rounded-lg text-xs font-bold transition-all text-white shadow-sm">
                  Подробнее
                </button>
                {conflict.type === 'missing_dependency' && (
                  <button className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm">
                    Установить зависимость
                  </button>
                )}
                {conflict.type === 'conflict' && (
                  <button className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm">
                    Удалить Sodium
                  </button>
                )}
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
