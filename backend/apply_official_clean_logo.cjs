const fs = require('fs');
const path = require('path');

function applyCleanLogo() {
  const genLogoPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\earthyelectronics_official_clean_logo_1785393868968.jpg';
  const targetDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  const targetAbs = path.join(targetDir, 'earthyelectronics_official_clean_logo.jpg');

  if (fs.existsSync(genLogoPath)) {
    fs.copyFileSync(genLogoPath, targetAbs);
    console.log(`✅ Copied new clean logo -> ${targetAbs}`);
  } else {
    console.log(`⚠️ Source generated logo missing`);
  }
}

applyCleanLogo();
