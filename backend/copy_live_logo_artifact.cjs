const fs = require('fs');
const path = require('path');

function copyLiveLogo() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const logoSrc = path.join(__dirname, '..', 'frontend', 'public', 'images', 'earthyelectronics_logo.png');
  const targetAbs = path.join(artifactsDir, 'live_site_header_logo.png');

  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, targetAbs);
    console.log(`✅ Copied live logo ${logoSrc} -> ${targetAbs}`);
  } else {
    console.log(`⚠️ Logo src missing: ${logoSrc}`);
  }
}

copyLiveLogo();
