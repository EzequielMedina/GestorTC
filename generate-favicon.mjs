import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateFavicon() {
  try {
    const inputPath = join(__dirname, 'src', 'assets', 'images', 'logo-icon.svg');
    const outputPath = join(__dirname, 'src', 'assets', 'images', 'favicon.ico');
    
    // Crear un ícono simple con sharp
    await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 63, g: 81, b: 181, alpha: 1 } // Color azul similar al SVG
      }
    })
    .composite([
      {
        input: Buffer.from(
          '<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="32" cy="32" r="28" fill="white"/>' +
          '<circle cx="32" cy="32" r="20" fill="#3F51B5"/>' +
          '<circle cx="32" cy="24" r="6" fill="white"/>' +
          '<path d="M32 40c-6.627 0-12-5.373-12-12v-4c0-6.627 5.373-12 12-12s12 5.373 12 12v4c0 6.627-5.373 12-12 12z" fill="white" fill-opacity="0.7"/>' +
          '</svg>'
        ),
        top: 0,
        left: 0
      }
    ])
    .toFile(outputPath);

    console.log('Favicon generado exitosamente en:', outputPath);
  } catch (error) {
    console.error('Error al generar el favicon:', error);
  }
}

generateFavicon();
