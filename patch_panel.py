import re

with open('src/components/ElyAuthModal.tsx', 'r') as f:
    content = f.read()

panel_old = """          {authMethod === 'password' ? ("""

panel_new = """          {authMethod === 'offline' ? (
            <form onSubmit={handleOfflineLogin} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Никнейм</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Steve"
                    className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all text-white placeholder:text-zinc-600 font-medium shadow-inner"
                  />
                </div>
                <div className="mt-3 text-[10px] text-zinc-500 leading-relaxed font-medium">
                  Вы входите в оффлайн режиме (Пиратка). Скины не будут отображаться на большинстве серверов.
                </div>
              </div>
              <button 
                type="submit" 
                disabled={!username.trim() || username.trim().length < 3}
                className="mt-2 w-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
              >
                Играть оффлайн
              </button>
            </form>
          ) : authMethod === 'password' ? ("""

content = content.replace(panel_old, panel_new)

with open('src/components/ElyAuthModal.tsx', 'w') as f:
    f.write(content)
