const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

const targetSteve = `<PlayerSkin2D username="Steve" isElyBy={false} className="w-auto h-[90%] filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]" />`;
const repSteve = `<SkinViewer username="Steve" />`;
code = code.replace(targetSteve, repSteve);

// Also I should double check if activeProfile is in props now.
const match = code.match(/activeProfileName: string,\n  activeProfile\?: any/);
if (!code.includes("activeProfile,")) {
  code = code.replace("activeProfileName\n}: {", "activeProfileName,\n  activeProfile\n}: {");
}

fs.writeFileSync('src/components/HomeTab.tsx', code);
