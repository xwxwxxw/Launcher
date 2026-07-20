const fs = require('fs');
let code = fs.readFileSync('src/components/ModsTab.tsx', 'utf8');

if (!code.includes('import { Brush, Sun, Package')) {
  code = code.replace("import { Trash2, Link as LinkIcon, Download, Search, Settings, RefreshCw, FolderOpen, Play, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';", "import { Trash2, Link as LinkIcon, Download, Search, Settings, RefreshCw, FolderOpen, Play, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Brush, Sun, Package } from 'lucide-react';");
}

code = code.replace(
  /<div className="w-16 h-16 bg-zinc-950 rounded-xl border border-zinc-800\/80 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner p-1">[\s\S]*?<\/div>/,
  `<div className="w-16 h-16 bg-zinc-950 rounded-xl border border-zinc-800/80 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner p-1">
        {mod.icon_url ? (
          <img 
            src={mod.icon_url} 
            alt="icon" 
            className="w-full h-full object-contain rounded-lg" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        
        <div className="w-full h-full flex items-center justify-center opacity-40" style={{ display: mod.icon_url ? 'none' : 'flex' }}>
          {contentType === 'resourcepacks' ? <Brush size={28} /> : contentType === 'shaderpacks' ? <Sun size={28} /> : <Package size={28} />}
        </div>
      </div>`
);

fs.writeFileSync('src/components/ModsTab.tsx', code);
