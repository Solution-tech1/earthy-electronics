const fs = require('fs');
const path = require('path');

function applyTightLogo() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const targetDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const srcFile = path.join(artifactsDir, 'earthy_electronics_tight_banner_logo_1785397235214.jpg');
  const targetLogoPath = path.join(targetDir, 'earthyelectronics_official_banner_logo.png');

  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, targetLogoPath);
    console.log("✅ Successfully replaced banner logo with tight edge-to-edge logo image:", targetLogoPath);
  }
}

applyTightLogo();
