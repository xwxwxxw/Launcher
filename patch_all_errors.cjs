const fs = require('fs');

// 1. Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace("req.file", "(req as any).file");
serverCode = serverCode.replace("!req.file", "!(req as any).file");
serverCode = serverCode.replace("req.file.path", "(req as any).file.path");
serverCode = serverCode.replace("const genericProfile = {", "const genericProfile = { description: '',");
serverCode = serverCode.replace(`  const activeProfile = profiles.find(p => p.id === profileId) || profiles[0] || {
    id: profileId ? String(profileId) : '1',
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric',
    mod_path: './profiles/1/.minecraft/mods'
  };`, `  const activeProfile: any = profiles.find(p => p.id === profileId) || profiles[0] || {
    id: profileId ? String(profileId) : '1',
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric',
    mod_path: './profiles/1/.minecraft/mods',
    description: ''
  };`);
fs.writeFileSync('server.ts', serverCode);

// 2. Fix HomeTab.tsx
let homeCode = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');
homeCode = homeCode.replace(`import { Package, ShieldAlert, Cpu, Layers, FolderTree, PlaySquare, Settings, ArrowRight, User } from 'lucide-react';`, `import { Package, ShieldAlert, Cpu, Layers, FolderTree, PlaySquare, Settings, ArrowRight, User } from 'lucide-react';\nimport PlayerSkin2D from './PlayerSkin2D';`);
// The activeProfile issue is because I might have broken the component params. Let's fix that.
const homeParamTarget = `  activeProfileName: string,
  activeProfile?: any
}) {`;
homeCode = homeCode.replace(homeParamTarget, `  activeProfileName: string,
  activeProfile?: any
}) {`);
// Oh, the error says Cannot find name 'activeProfile'. In HomeTab.tsx:79. 
// Did I replace the props correctly? Let's check if activeProfile is in the destructured arguments.
// The props is: `{ onNavigate, userProfile, onLoginClick, modsCount, profilesCount, conflictsCount, ram, activeProfileName }: { ... }`
// Let's replace the whole signature.
const homeSigOld = `export default function HomeTab({ 
  onNavigate, 
  userProfile, 
  onLoginClick,
  modsCount,
  profilesCount,
  conflictsCount,
  ram,
  activeProfileName
}: { 
  onNavigate: (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts') => void, 
  userProfile?: {name: string, id: string, accessToken: string} | null, 
  onLoginClick: () => void,
  modsCount: number,
  profilesCount: number,
  conflictsCount: number,
  ram: number,
  activeProfileName: string,
  activeProfile?: any
}) {`;
const homeSigNew = `export default function HomeTab({ 
  onNavigate, 
  userProfile, 
  onLoginClick,
  modsCount,
  profilesCount,
  conflictsCount,
  ram,
  activeProfileName,
  activeProfile
}: { 
  onNavigate: (tab: 'home' | 'mods' | 'profiles' | 'settings' | 'conflicts') => void, 
  userProfile?: {name: string, id: string, accessToken: string} | null, 
  onLoginClick: () => void,
  modsCount: number,
  profilesCount: number,
  conflictsCount: number,
  ram: number,
  activeProfileName: string,
  activeProfile?: any
}) {`;
homeCode = homeCode.replace(homeSigOld, homeSigNew);
fs.writeFileSync('src/components/HomeTab.tsx', homeCode);

// 3. Fix SettingsModal.tsx
let settingsCode = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
settingsCode = settingsCode.replace(`import { X, Folder, Monitor, Settings2, ShieldCheck, Gamepad2, Info } from 'lucide-react';`, `import { X, Folder, Monitor, Settings2, ShieldCheck, Gamepad2, Info, CheckCircle2 } from 'lucide-react';`);
fs.writeFileSync('src/components/SettingsModal.tsx', settingsCode);

// 4. Fix SkinViewer.tsx
let skinCode = fs.readFileSync('src/components/SkinViewer.tsx', 'utf8');
skinCode = skinCode.replace(`viewer.animations.add(skinview3d.WalkingAnimation);`, `viewer.animation = new skinview3d.WalkingAnimation();`);
skinCode = skinCode.replace(`viewer.animations.add(skinview3d.RotatingAnimation);`, `viewer.autoRotate = true;`);
fs.writeFileSync('src/components/SkinViewer.tsx', skinCode);

// 5. Fix ProfilesTab.tsx 'onRefresh'
let profilesCode = fs.readFileSync('src/components/ProfilesTab.tsx', 'utf8');
// wait, we don't have onRefresh inside ProfilesTab props. We can just use location.reload() or pass a new prop
profilesCode = profilesCode.replace(`onRefresh();`, `window.location.reload();`);
fs.writeFileSync('src/components/ProfilesTab.tsx', profilesCode);

