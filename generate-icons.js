import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImage = path.resolve('src/assets/images/layle_launcher_icon_1784025684123.jpg');

async function createIco() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  
  for (const size of sizes) {
    const buf = await sharp(srcImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 9, g: 9, b: 11, alpha: 1 }
      })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: buf });
  }
  
  // Create ICO file
  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 (ICO)
  header.writeUInt16LE(sizes.length, 4); // Number of images
  
  const entries = [];
  let currentOffset = 6 + sizes.length * 16;
  
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    // Width and height (0 means 256)
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel (32)
    entry.writeUInt32LE(item.buffer.length, 8); // Size of PNG data
    entry.writeUInt32LE(currentOffset, 12); // Offset of PNG data
    
    entries.push(entry);
    currentOffset += item.buffer.length;
  }
  
  const fileBuffer = Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map(item => item.buffer)
  ]);
  
  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }
  
  fs.writeFileSync('public/icon.ico', fileBuffer);
  console.log('Successfully generated public/icon.ico with multiple sizes!');
}

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
  await createIco();
  await createPng();
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
