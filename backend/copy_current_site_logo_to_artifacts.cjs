const fs = require('fs');
const path = require('path');

function copyCurrentSiteLogo() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  console.log("Searching for live site logos in frontend/public/images/...");

  const files = fs.readdirSync(publicDir).filter(f => f.toLowerCase().includes('logo'));
  console.log("Found site logos:", files);

  files.forEach(f => {
    const srcAbs = path.join(publicDir, f);
    const targetAbs = path.join(artifactsDir, `current_live_${f}`);
    fs.copyFileSync(srcAbs, targetAbs);
    console.log(`✅ Copied ${f} -> ${targetAbs}`);
  });

  // Delete previous generated logo files from artifacts directory as requested by user ("yah baykar hain saray yah dlt krdo saray")
  const badLogos = [
    'client_earth_logo1.png', 'client_earth_logo2.png', 'client_earth_logo3.png',
    'ultra_3d_earth_logo1.png', 'ultra_3d_earth_logo2.png',
    'design_com_logo_1.png', 'design_com_logo_2.png', 'design_com_logo_3.png', 'design_com_logo_4.png', 'design_com_logo_5.png'
  ];

  badLogos.forEach(bl => {
    const p = path.join(artifactsDir, bl);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`🗑️ Deleted unwanted generated logo artifact: ${bl}`);
    }
  });
}

copyCurrentSiteLogo();
