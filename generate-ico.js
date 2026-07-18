import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

async function generate() {
  try {
    const imagesDir = 'src/assets/images';
    const preferredImage = path.join(imagesDir, 'launcher_icon_1784385138049.jpg');
    const fallbackImage1 = path.join(imagesDir, 'launcher_icon_1783961531253.jpg');
    const fallbackImage2 = path.join(imagesDir, 'layle_launcher_icon_1784025684123.jpg');
    const targetPng = 'public/icon.png';
    const targetIco = 'public/icon.ico';

    let sourceImage = null;

    if (fs.existsSync(preferredImage)) {
      sourceImage = preferredImage;
    } else if (fs.existsSync(fallbackImage1)) {
      sourceImage = fallbackImage1;
    } else if (fs.existsSync(fallbackImage2)) {
      sourceImage = fallbackImage2;
    } else {
      // If no source JPEG is found, check if there's any JPG in the images directory
      if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir);
        const jpgFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
        if (jpgFile) {
          sourceImage = path.join(imagesDir, jpgFile);
        }
      }
    }

    if (!sourceImage) {
      console.warn('Warning: No source JPEG found in src/assets/images. We will try to clean the existing public/icon.png instead.');
      if (fs.existsSync(targetPng)) {
        sourceImage = targetPng;
      } else {
        throw new Error('No source image found to generate icons!');
      }
    }

    console.log(`Using source image: ${sourceImage}`);

    // 1. Convert/clean and resize the source to a perfect, standardized 512x512 PNG using sharp
    console.log(`Generating/cleaning standard 512x512 PNG at ${targetPng}...`);
    await sharp(sourceImage)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
      .toFile(targetPng + '.tmp');

    // Replace the old PNG safely
    if (fs.existsSync(targetPng)) {
      fs.unlinkSync(targetPng);
    }
    fs.renameSync(targetPng + '.tmp', targetPng);
    console.log(`Successfully generated clean PNG at ${targetPng}`);

    // 2. Convert the clean PNG to a standard ICO file
    console.log(`Converting clean PNG to ${targetIco}...`);
    const buf = await pngToIco(targetPng);
    
    if (fs.existsSync(targetIco)) {
      fs.unlinkSync(targetIco);
    }
    fs.writeFileSync(targetIco, buf);
    console.log(`Successfully generated ICO at ${targetIco}!`);

  } catch (err) {
    console.error('Error generating icons in generate-ico.js:', err);
    process.exit(1);
  }
}

generate();
