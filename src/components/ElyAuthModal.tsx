import React, { useState } from 'react';
import { X, Lock, User as UserIcon } from 'lucide-react';

interface ElyAuthModalProps {
  onClose: () => void;
  onSuccess: (profile: { name: string, id: string, accessToken: string }) => void;
}

export default function ElyAuthModal({ onClose, onSuccess }: ElyAuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/ely', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.errorMessage || data.error || 'Ошибка авторизации');
      }

      if (data.selectedProfile && data.accessToken) {
        onSuccess({
          name: data.selectedProfile.name,
          id: data.selectedProfile.id,
          accessToken: data.accessToken
        });
      } else {
        throw new Error('Профиль не найден');
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось подключиться к серверу Ely.by');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full"></div>

        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-zinc-900/30 relative z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Авторизация Ely.by</h2>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-bold">Безопасный вход</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleLogin} className="p-8 relative z-10 flex flex-col gap-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-medium text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Логин или E-mail</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 text-zinc-500" size={16} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ivan@example.com"
                className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all text-white placeholder:text-zinc-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-zinc-500" size={16} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all text-white placeholder:text-zinc-600 font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95"
          >
            {loading ? 'Подключение...' : 'Войти в аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}
