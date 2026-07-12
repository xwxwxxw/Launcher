const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!pkg.build.nsis) {
  pkg.build.nsis = {};
}
pkg.build.nsis = {
  oneClick: false,
  allowToChangeInstallationDirectory: true,
  createDesktopShortcut: true,
  createStartMenuShortcut: true,
  shortcutName: "Layle Launcher"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
