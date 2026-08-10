const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;
const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true });
}

// Find generated logos in brainDir
const files = fs.readdirSync(brainDir);
const logoFile = files.find(f => f.startsWith('earthyelectronics_text_logo2') && f.endsWith('.jpg')) ||
                 files.find(f => f.startsWith('earthyelectronics_text_logo1') && f.endsWith('.jpg')) ||
                 files.find(f => f.startsWith('earthy_electronics_logo') && f.endsWith('.jpg'));

if (logoFile) {
  const srcPath = path.join(brainDir, logoFile);
  const destPath = path.join(publicImagesDir, 'earthyelectronics_logo.png');

  sharp(srcPath)
    .png({ quality: 100 })
    .toFile(destPath)
    .then(() => {
      console.log(`✅ Successfully attached AI-generated logo to: ${destPath}`);
    })
    .catch(err => {
      console.error(`Error processing logo: ${err.message}`);
    });
} else {
  console.error("No logo file found in brain dir");
}
