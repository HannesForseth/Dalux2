import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, '../public/bloxr-icon.png');
const publicDir = path.join(__dirname, '../public');

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

async function generateIcons() {
  // Check if sharp is available
  if (!sharp) {
    console.error('Sharp is not available. Install it with: npm install sharp');
    process.exit(1);
  }

  // Check source file exists
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    process.exit(1);
  }

  console.log('Generating PWA icons from:', sourceIcon);

  for (const { size, name } of sizes) {
    const outputPath = path.join(publicDir, name);

    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`Error generating ${name}:`, error.message);
    }
  }

  console.log('Done!');
}

generateIcons();
