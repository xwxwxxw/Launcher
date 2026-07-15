import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function NotificationToast({ toasts, onClose }: NotificationToastProps) {
  return (
    <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-zinc-950/90 border-zinc-800 text-zinc-200';
          let Icon = Info;
          let iconColor = 'text-blue-400';
          let borderGlow = 'shadow-[0_4px_20px_rgba(0,0,0,0.5)]';

          if (toast.type === 'success') {
            bgColor = 'bg-zinc-950/95 border-emerald-500/30 text-zinc-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
            borderGlow = 'shadow-[0_0_20px_rgba(16,185,129,0.15)]';
          } else if (toast.type === 'error') {
            bgColor = 'bg-zinc-950/95 border-red-500/30 text-zinc-100';
            Icon = AlertCircle;
            iconColor = 'text-red-400';
            borderGlow = 'shadow-[0_0_20px_rgba(239,68,68,0.15)]';
          }

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex gap-3.5 items-start p-4 rounded-xl border backdrop-blur-xl ${bgColor} ${borderGlow} transition-all duration-300 w-full`}
            >
              <div className={`mt-0.5 p-1 rounded-lg bg-zinc-900/50 ${iconColor}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 font-mono">
                  {toast.type === 'success' ? 'Успешно' : toast.type === 'error' ? 'Внимание' : 'Информация'}
                </span>
                <p className="text-xs font-bold leading-relaxed pr-2 font-sans select-text whitespace-pre-line">{toast.message}</p>
              </div>
              <button
                onClick={() => onClose(toast.id)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
