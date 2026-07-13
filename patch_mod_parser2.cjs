const fs = require('fs');
let code = fs.readFileSync('src/lib/modParser.ts', 'utf8');

const target1 = `  let environment = '';
  let depends: string[] = [];`;

const rep1 = `  let environment = '';
  let depends: string[] = [];
  let iconDataUrl = '';`;

code = code.replace(target1, rep1);

const target2 = `        if (json.icon && typeof json.icon === 'string') {
          const iconFile = zip.file(json.icon);
          if (iconFile) {
            const buffer = await iconFile.async('nodebuffer');
            modInfo.icon_url = 'data:image/png;base64,' + buffer.toString('base64');
          }
        }`;

const rep2 = `        if (json.icon && typeof json.icon === 'string') {
          const iconFile = zip.file(json.icon);
          if (iconFile) {
            const buffer = await iconFile.async('nodebuffer');
            iconDataUrl = 'data:image/png;base64,' + buffer.toString('base64');
          }
        }`;

code = code.replace(target2, rep2);

const target3 = `    warnings: [],
    icon_url: '',`;

const rep3 = `    warnings: [],
    icon_url: iconDataUrl,`;

code = code.replace(target3, rep3);

fs.writeFileSync('src/lib/modParser.ts', code);
