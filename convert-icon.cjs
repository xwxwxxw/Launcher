const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');

async function processIcon() {
  try {
    const fn = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;
    
    // Convert PNG to ICO
    const buf = await fn('public/icon.png');
    fs.writeFileSync('public/icon.ico', buf);
    console.log('ICO generated at public/icon.ico');
  } catch (err) {
    console.error('Error generating icon:', err);
    process.exit(1);
  }
}

processIcon();
