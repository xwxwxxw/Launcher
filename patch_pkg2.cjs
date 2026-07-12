const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts['preelectron:build'] = 'npm version patch --no-git-tag-version';

pkg.build.nsis = {
  ...pkg.build.nsis,
  oneClick: false,
  perMachine: false,
  allowToChangeInstallationDirectory: true,
  createDesktopShortcut: true,
  createStartMenuShortcut: true,
  shortcutName: "Layle Launcher",
  runAfterFinish: true,
  language: 1049 // Russian Language ID
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
