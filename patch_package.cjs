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
  shortcutName: "Layle Launcher",
  installerIcon: "public/icon.ico",
  uninstallerIcon: "public/icon.ico"
};

// Also let's set app icon if it's there
pkg.build.win = {
  ...pkg.build.win,
  icon: "public/icon.ico"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
