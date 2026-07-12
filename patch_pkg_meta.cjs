const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.description = "Minecraft Launcher";
pkg.author = "Layle";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
