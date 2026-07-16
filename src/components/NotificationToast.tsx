import { X, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message?: string;
  duration?: number;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function NotificationToast({ toasts, onClose }: NotificationToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`
              flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/30' : ''}
              ${toast.type === 'error' ? 'bg-red-950/80 border-red-500/30' : ''}
              ${toast.type === 'info' ? 'bg-blue-950/80 border-blue-500/30' : ''}
              ${toast.type === 'loading' ? 'bg-zinc-900/90 border-zinc-700/50' : ''}
            `}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
              {toast.type === 'error' && <AlertTriangle size={18} className="text-red-500" />}
              {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
              {toast.type === 'loading' && <Loader2 size={18} className="text-emerald-500 animate-spin" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => onClose(toast.id)}
              className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
