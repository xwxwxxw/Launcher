import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImage = path.resolve('src/assets/images/layle_launcher_icon_1784025684123.jpg');

async function createPng() {
  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  await sharp(srcImage)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 9, g: 9, b: 11, alpha: 1 }
    })
    .png()
    .toFile('public/icon.png');
  console.log('Successfully generated public/icon.png!');
}

async function main() {
  await createPng();
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
