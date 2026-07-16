const fs = require('fs');
let code = fs.readFileSync('src/components/SkinViewer.tsx', 'utf8');

code = code.replace(/import { SkinViewer as Skinview3D, createOrbitControls, WalkingAnimation } from "skinview3d";/g, 'import { SkinViewer as Skinview3D, WalkingAnimation } from "skinview3d";');
code = code.replace(/const control = createOrbitControls\(viewer\);\\n    control\.enableRotate = true;\\n    control\.enableZoom = true;\\n    control\.enablePan = false;/g, '');

fs.writeFileSync('src/components/SkinViewer.tsx', code);
