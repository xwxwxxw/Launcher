const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

delete pkg.build.nsis.installerIcon;
delete pkg.build.nsis.uninstallerIcon;
delete pkg.build.win.icon;

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
