const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../src/assets/images/logo-icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Asegurar que el directorio existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generando iconos desde SVG...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generado: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('\n¡Iconos generados exitosamente!');
}

generateIcons().catch(console.error);

