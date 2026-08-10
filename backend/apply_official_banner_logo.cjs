const fs = require('fs');
const path = require('path');

function applyOfficialBannerLogo() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const targetDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const demo1 = path.join(artifactsDir, 'earthy_electronics_full_banner_logo_v1_1785395144445.jpg');
  const targetLogoPath = path.join(targetDir, 'earthyelectronics_official_banner_logo.png');

  if (fs.existsSync(demo1)) {
    fs.copyFileSync(demo1, targetLogoPath);
    console.log("✅ Successfully saved official banner logo to frontend public images:", targetLogoPath);
  } else {
    console.error("Error: Generated demo1 logo missing in artifacts");
  }
}

applyOfficialBannerLogo();
