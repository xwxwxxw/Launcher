const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!pkg.build.files.includes("public/**/*")) {
  pkg.build.files.push("public/**/*");
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
