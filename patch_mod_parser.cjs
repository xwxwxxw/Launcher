const fs = require('fs');
let code = fs.readFileSync('src/lib/modParser.ts', 'utf8');

const target1 = `        if (json.depends && typeof json.depends === 'object') {
          depends = Object.keys(json.depends);
        }`;

const rep1 = `        if (json.depends && typeof json.depends === 'object') {
          depends = Object.keys(json.depends);
        }
        if (json.icon && typeof json.icon === 'string') {
          const iconFile = zip.file(json.icon);
          if (iconFile) {
            const buffer = await iconFile.async('nodebuffer');
            modInfo.icon_url = 'data:image/png;base64,' + buffer.toString('base64');
          }
        }`;

code = code.replace(target1, rep1);

const target2 = `        mod.icon_url = project.icon_url || '';`;

const rep2 = `        if (!mod.icon_url) {
          mod.icon_url = project.icon_url || '';
        }`;

code = code.replace(target2, rep2);

fs.writeFileSync('src/lib/modParser.ts', code);
