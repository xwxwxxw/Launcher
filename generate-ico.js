import fs from 'fs';
import pngToIco from 'png-to-ico';

async function generate() {
  try {
    console.log('Converting public/icon.png to public/icon.ico...');
    const buf = await pngToIco('public/icon.png');
    fs.writeFileSync('public/icon.ico', buf);
    console.log('Successfully generated public/icon.ico!');
  } catch (err) {
    console.error('Error generating ICO:', err);
    process.exit(1);
  }
}

generate();
