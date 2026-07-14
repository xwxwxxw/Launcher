const fs = require('fs');
let content = fs.readFileSync('src/components/ModrinthModal.tsx', 'utf8');

const warningComponent = `
function WarningLabel({ type }: { type: 'client' | 'server' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[9px] uppercase tracking-widest font-bold w-fit mt-2">
      <ShieldAlert size={10} />
      Не работает на {type === 'client' ? 'клиенте' : 'сервере'}!
    </div>
  );
}
`;

const importFix = content.replace("import { Search, Download, Loader2, Star, DownloadCloud, Box, Globe, Palette, Sun, Layers }", "import { Search, Download, Loader2, Star, DownloadCloud, Box, Globe, Palette, Sun, Layers, ShieldAlert }");

const targetContent = `                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'Описание отсутствует.'}
                    </p>
                  </div>`;

const newContent = `                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'Описание отсутствует.'}
                    </p>
                    {contentType === 'mod' && installTarget === 'client' && project.client_side === 'unsupported' && (
                      <WarningLabel type="client" />
                    )}
                    {contentType === 'mod' && installTarget === 'server' && project.server_side === 'unsupported' && (
                      <WarningLabel type="server" />
                    )}
                  </div>`;

content = importFix.replace(targetContent, newContent) + warningComponent;
fs.writeFileSync('src/components/ModrinthModal.tsx', content);
