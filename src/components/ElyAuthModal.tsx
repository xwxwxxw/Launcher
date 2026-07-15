import React, { useState, useEffect } from 'react';
import { X, Lock, User as UserIcon, Globe, ShieldCheck } from 'lucide-react';

interface ElyAuthModalProps {
  onClose: () => void;
  onSuccess: (profile: { name: string, id: string, accessToken: string }) => void;
}

export default function ElyAuthModal({ onClose, onSuccess }: ElyAuthModalProps) {
  const [authMethod, setAuthMethod] = useState<'password' | 'oauth'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Custom OAuth settings for local/custom client ID
  const [useCustomOAuth, setUseCustomOAuth] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Load custom OAuth settings and remembered credentials from localStorage
  useEffect(() => {
    const savedUseCustom = localStorage.getItem('ely_use_custom_oauth') === 'true';
    const savedId = localStorage.getItem('ely_custom_client_id') || '';
    const savedSecret = localStorage.getItem('ely_custom_client_secret') || '';
    setUseCustomOAuth(savedUseCustom);
    setCustomClientId(savedId);
    setCustomClientSecret(savedSecret);

    const savedRemember = localStorage.getItem('ely_remember_me') !== 'false';
    setRememberMe(savedRemember);
    if (savedRemember) {
      const savedUser = localStorage.getItem('ely_saved_username') || '';
      const savedPass = localStorage.getItem('ely_saved_password') || '';
      setUsername(savedUser);
      setPassword(savedPass);
    }
  }, []);

  // Listen to postMessage from the popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.profile) {
        onSuccess(event.data.profile);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

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
        if (rememberMe) {
          localStorage.setItem('ely_remember_me', 'true');
          localStorage.setItem('ely_saved_username', username);
          localStorage.setItem('ely_saved_password', password);
        } else {
          localStorage.setItem('ely_remember_me', 'false');
          localStorage.removeItem('ely_saved_username');
          localStorage.removeItem('ely_saved_password');
        }
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

  const handleOAuthLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Save custom settings
      localStorage.setItem('ely_use_custom_oauth', useCustomOAuth.toString());
      if (useCustomOAuth) {
        localStorage.setItem('ely_custom_client_id', customClientId);
        localStorage.setItem('ely_custom_client_secret', customClientSecret);
      }

      // Build parameters
      const params = new URLSearchParams();
      params.append('origin', window.location.origin);
      if (useCustomOAuth && customClientId) {
        params.append('client_id', customClientId);
      }
      if (useCustomOAuth && customClientSecret) {
        params.append('client_secret', customClientSecret);
      }

      const res = await fetch(`/api/auth/ely/url?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось получить ссылку авторизации.');
      }

      if (typeof window !== 'undefined' && (window as any).require) {
        const { shell } = (window as any).require('electron');
        shell.openExternal(data.url);
      } else {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(data.url, 'ely_oauth_popup', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
      }
      
      // Poll the local server to check if the user completed auth in the system browser
      const checkStatus = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/ely/status');
          const statusData = await statusRes.json();
          if (statusData.success && statusData.profile) {
            clearInterval(checkStatus);
            onSuccess(statusData.profile);
            onClose();
          }
        } catch(e) {}
      }, 1500);

      setTimeout(() => clearInterval(checkStatus), 5 * 60 * 1000); // timeout 5 mins

    } catch (err: any) {
      setError(err.message || 'Ошибка запуска браузерной авторизации.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[150px] bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-zinc-900/30 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Авторизация Ely.by</h2>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 mt-0.5 font-bold">Официальный аккаунт</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Auth Method Tabs */}
        <div className="px-6 pt-6 relative z-10">
          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl">
            <button
              onClick={() => { setAuthMethod('password'); setError(''); }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                authMethod === 'password'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              По паролю
            </button>
            <button
              onClick={() => { setAuthMethod('oauth'); setError(''); }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all relative overflow-visible ${
                authMethod === 'oauth'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Через браузер
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[7px] font-extrabold uppercase px-1.5 rounded-md py-0.5 tracking-wider">
                в разработке
              </span>
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="p-6 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-2xl font-medium text-center mb-5 leading-relaxed">
              {error}
            </div>
          )}

          {authMethod === 'password' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Логин или E-mail</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ivan@example.com"
                    className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all text-white placeholder:text-zinc-600 font-medium shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all text-white placeholder:text-zinc-600 font-medium shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center mt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/30 focus:ring-opacity-25 h-4 w-4 transition-all cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">Запомнить меня</span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="mt-2 w-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
              >
                {loading ? 'Подключение...' : 'Войти по паролю'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-3.5 rounded-2xl font-medium flex items-center gap-2.5 leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <span>Эта функция в разработке. Пожалуйста, используйте вход по логину и паролю.</span>
              </div>

              <div className="text-zinc-400 text-xs leading-relaxed font-medium">
                Безопасная авторизация через официальный сайт <span className="text-emerald-400 font-bold">Ely.by</span>. Пароль не передаётся лаунчеру напрямую.
              </div>

              {/* Developer settings toggle */}
              <div className="mt-2 border border-zinc-800/60 bg-zinc-950/40 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Кастомный OAuth (локальный вход)</span>
                  <button
                    type="button"
                    onClick={() => setUseCustomOAuth(!useCustomOAuth)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${useCustomOAuth ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${useCustomOAuth ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {useCustomOAuth ? (
                  <div className="flex flex-col gap-3.5 mt-2 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Client ID</label>
                      <input 
                        type="text" 
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        placeholder="ID клиента из Ely.by"
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Client Secret</label>
                      <input 
                        type="password" 
                        value={customClientSecret}
                        onChange={(e) => setCustomClientSecret(e.target.value)}
                        placeholder="Секретный ключ клиента"
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/40 mt-1">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Redirect URI для Ely.by:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono text-emerald-400/90 break-all select-all flex-1">
                          {window.location.origin}/api/auth/ely/callback
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/auth/ely/callback`);
                            setCopiedRedirect(true);
                            setTimeout(() => setCopiedRedirect(false), 2000);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                        >
                          {copiedRedirect ? 'Коп.' : 'Скоп.'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-500 leading-relaxed">
                    Для локального входа (или на кастомном домене) включите этот переключатель и зарегистрируйте своё OAuth-приложение в личном кабинете разработчика Ely.by.
                  </div>
                )}
              </div>

              <button 
                onClick={handleOAuthLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95"
              >
                <Globe size={16} strokeWidth={2.5} />
                {loading ? 'Открываем браузер...' : 'Войти через Ely.by'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
