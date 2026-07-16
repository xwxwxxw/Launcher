const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIco() {
  const sourceImgPath = path.join(__dirname, 'public', 'icon.png');
  const targetIcoPath = path.join(__dirname, 'public', 'icon.ico');

  console.log(`Loading source image: ${sourceImgPath}`);
  
  // Sizes to include in the ICO
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  // 1. Generate PNG buffer for each size using sharp
  for (const size of sizes) {
    console.log(`Generating PNG for size ${size}x${size}...`);
    const buffer = await sharp(sourceImgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    pngBuffers.push({
      size,
      buffer
    });
  }

  // 2. Build the ICO Header (6 bytes)
  // - Reserved: 2 bytes (0)
  // - Type: 2 bytes (1 for ICO)
  // - Count: 2 bytes (number of images)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type = 1 (ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Count

  // 3. Build the Directory Entries (16 bytes per entry)
  const entries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    const sizeVal = item.size === 256 ? 0 : item.size;

    entry.writeUInt8(sizeVal, 0); // Width
    entry.writeUInt8(sizeVal, 1); // Height
    entry.writeUInt8(0, 2);       // Color palette (0 = no palette)
    entry.writeUInt8(0, 3);       // Reserved (0)
    entry.writeUInt16LE(1, 4);    // Color planes (1)
    entry.writeUInt16LE(32, 6);   // Bits per pixel (32)
    entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12);     // Offset of image data

    entries.push(entry);
    currentOffset += item.buffer.length;
  }

  // 4. Concatenate everything
  const finalBuffer = Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map(item => item.buffer)
  ]);

  // 5. Save the file
  fs.writeFileSync(targetIcoPath, finalBuffer);
  console.log(`Successfully generated valid ICO at: ${targetIcoPath} (Size: ${finalBuffer.length} bytes)`);
}

generateIco().catch(err => {
  console.error('Failed to generate ICO:', err);
  process.exit(1);
});
