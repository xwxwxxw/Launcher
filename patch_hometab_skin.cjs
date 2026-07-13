const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

const importTarget = `import PlayerSkin2D from './PlayerSkin2D';`;
const importRep = `import SkinViewer from './SkinViewer';`;
code = code.replace(importTarget, importRep);

const userSkinTarget = `<PlayerSkin2D username={userProfile.name} uuid={userProfile.id} isElyBy={true} className="w-auto h-[90%] filter drop-shadow-[0_15px_25px_rgba(59,130,246,0.35)] group-hover:scale-[1.03] transition-all duration-500" />`;
const userSkinRep = `<SkinViewer username={userProfile.name} />`;
code = code.replace(userSkinTarget, userSkinRep);

fs.writeFileSync('src/components/HomeTab.tsx', code);
