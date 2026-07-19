const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '2.0.4';
pkg.build.win.icon = 'public/icon.ico';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
