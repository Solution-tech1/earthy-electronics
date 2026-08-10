const fs = require('fs');
const path = require('path');

function copyDemos() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const targetDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const demo1 = path.join(artifactsDir, 'earthy_electronics_full_banner_logo_v1_1785395144445.jpg');
  const demo2 = path.join(artifactsDir, 'earthy_electronics_full_banner_logo_v2_1785395159283.jpg');

  if (fs.existsSync(demo1)) {
    fs.copyFileSync(demo1, path.join(targetDir, 'banner_logo_demo_v1.jpg'));
    console.log("✅ Copied demo v1 to frontend public images");
  }
  if (fs.existsSync(demo2)) {
    fs.copyFileSync(demo2, path.join(targetDir, 'banner_logo_demo_v2.jpg'));
    console.log("✅ Copied demo v2 to frontend public images");
  }
}

copyDemos();
