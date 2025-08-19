const { convertFile } = require('svg-to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'src', 'assets', 'images', 'logo-icon.svg');
const icoPath = path.join(__dirname, 'src', 'favicon.ico');

// Convertir SVG a ICO
convertFile(svgPath, icoPath)
  .then(() => {
    console.log('Favicon generado exitosamente en:', icoPath);
  })
  .catch(error => {
    console.error('Error al generar el favicon:', error);
  });
