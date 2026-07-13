const fs = require('fs');
let code = fs.readFileSync('src/components/ProfilesTab.tsx', 'utf8');

const importTarget = `import { Plus, Edit, Trash2, Box } from 'lucide-react';`;
const importRep = `import { Plus, Edit, Trash2, Box, Download, Upload } from 'lucide-react';`;
code = code.replace(importTarget, importRep);

const createTarget = `<Plus size={18} strokeWidth={2.5} /> Создать сборку
        </button>
      </div>`;
const createRep = `<Plus size={18} strokeWidth={2.5} /> Создать сборку
        </button>
        <button 
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e: any) => {
              const file = e.target.files[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch('/api/profiles/import', { method: 'POST', body: formData });
              if (res.ok) {
                onRefresh();
              } else {
                const err = await res.json();
                alert(err.error || 'Ошибка импорта');
              }
            };
            input.click();
          }}
          className="ml-4 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Upload size={18} strokeWidth={2.5} /> Импорт
        </button>
      </div>`;
code = code.replace(createTarget, createRep);

const cardIconsTarget = `        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}`;
const cardIconsRep = `        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); window.open(\`/api/profiles/\${profile.id}/export\`, '_blank'); }} 
            className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
            title="Экспорт сборки (ZIP)"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}`;
code = code.replace(cardIconsTarget, cardIconsRep);

fs.writeFileSync('src/components/ProfilesTab.tsx', code);
