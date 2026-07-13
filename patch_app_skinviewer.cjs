const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import LauncherSplashScreen from './components/LauncherSplashScreen';`;
const importRep = `import LauncherSplashScreen from './components/LauncherSplashScreen';\nimport SkinViewer from './components/SkinViewer';`;

code = code.replace(importTarget, importRep);

const renderTarget = `                <h1 className="text-4xl font-bold text-white mb-2 truncate max-w-[600px]" title={activeProfile.name}>
                  {activeProfile.name}
                </h1>
                <div className="flex gap-4 text-sm font-medium">`;
const renderRep = `                <h1 className="text-4xl font-bold text-white mb-2 truncate max-w-[600px]" title={activeProfile.name}>
                  {activeProfile.name}
                </h1>
                <div className="flex gap-4 text-sm font-medium mb-4">`;

code = code.replace(renderTarget, renderRep);

const skinTarget = `            {/* Main Content Area based on Tab */}
            <div className="flex-1 overflow-auto bg-zinc-950/40 rounded-t-xl p-6 mr-6 mb-6">`;

const skinRep = `            <div className="absolute right-10 bottom-32 pointer-events-auto">
              {userProfile && <SkinViewer username={userProfile.name} />}
            </div>

            {/* Main Content Area based on Tab */}
            <div className="flex-1 overflow-auto bg-zinc-950/40 rounded-t-xl p-6 mr-6 mb-6 z-10">`;

code = code.replace(skinTarget, skinRep);

fs.writeFileSync('src/App.tsx', code);
