import re

with open('src/components/ElyAuthModal.tsx', 'r') as f:
    content = f.read()

tabs_old = r"""          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl">
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
          </div>"""

tabs_new = """          <div className="flex bg-zinc-950 border border-zinc-900 rounded-2xl p-1 gap-1">
            <button
              onClick={() => { setAuthMethod('offline'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                authMethod === 'offline'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Пиратка
            </button>
            <button
              onClick={() => { setAuthMethod('password'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                authMethod === 'password'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Ely.by
            </button>
            <button
              onClick={() => { setAuthMethod('oauth'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all relative overflow-visible ${
                authMethod === 'oauth'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Браузер
            </button>
          </div>"""

content = content.replace(tabs_old, tabs_new)

with open('src/components/ElyAuthModal.tsx', 'w') as f:
    f.write(content)
