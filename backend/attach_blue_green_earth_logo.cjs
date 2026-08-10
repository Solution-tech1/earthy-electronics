const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;
const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

const files = fs.readdirSync(brainDir);
const logoFile = files.find(f => f.startsWith('earthy_electronics_blue_green_earth') && f.endsWith('.jpg'));

if (logoFile) {
  const srcPath = path.join(brainDir, logoFile);
  const destPath = path.join(publicImagesDir, 'earthyelectronics_logo.png');

  sharp(srcPath)
    .png({ quality: 100 })
    .toFile(destPath)
    .then(() => {
      console.log(`✅ Successfully attached Blue & Green Earth Logo to: ${destPath}`);
    })
    .catch(err => {
      console.error(`Error processing logo: ${err.message}`);
    });
} else {
  console.error("No Blue & Green Earth logo file found");
}
