const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');

async function processIcon() {
  try {
    const buf = await pngToIco('public/icon.png');
    fs.writeFileSync('public/icon.ico', buf);
    console.log('ICO generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}
processIcon();
