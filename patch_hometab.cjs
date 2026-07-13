const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

// Replace SkinViewer width/height
code = code.replace(/<SkinViewer username={userProfile.name} \/>/g, '<SkinViewer username={userProfile.name} width={200} height={250} />');
code = code.replace(/<SkinViewer username="Steve" \/>/g, '<SkinViewer username="Steve" width={200} height={250} />');

// Add the button
const buttonHtml = `              <h3 className="text-xl font-bold tracking-wide text-zinc-100 mb-4">{userProfile.name}</h3>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).require) {
                    const { shell } = (window as any).require('electron');
                    shell.openExternal('https://ely.by');
                  } else {
                    window.open('https://ely.by', '_blank');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-[10px] font-bold uppercase tracking-widest transition-colors border border-blue-500/30"
              >
                Изменить скин (Ely.by)
              </button>`;

code = code.replace(/<h3 className="text-xl font-bold tracking-wide text-zinc-100">{userProfile\.name}<\/h3>/, buttonHtml);

fs.writeFileSync('src/components/HomeTab.tsx', code);
