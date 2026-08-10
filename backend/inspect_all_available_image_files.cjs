const fs = require('fs');
const path = require('path');

function inspectAllFiles() {
  const backendDir = path.join(__dirname);
  const p1 = path.join(backendDir, 'all products files');
  const p2 = path.join(backendDir, 'product files');
  const p3 = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  console.log("=== P1: all products files ===");
  if (fs.existsSync(p1)) {
    fs.readdirSync(p1).forEach(f => console.log(" ", f));
    const subP = path.join(p1, 'products');
    if (fs.existsSync(subP)) {
      console.log("  --- subfolder: products ---");
      fs.readdirSync(subP).slice(0, 15).forEach(f => console.log("   ", f));
    }
  }

  console.log("\n=== P2: product files ===");
  if (fs.existsSync(p2)) {
    fs.readdirSync(p2).forEach(f => console.log(" ", f));
  }

  console.log("\n=== P3: frontend/public/images/products ===");
  if (fs.existsSync(p3)) {
    console.log(" Total images in public:", fs.readdirSync(p3).length);
    fs.readdirSync(p3).slice(0, 15).forEach(f => console.log(" ", f));
  }
}

inspectAllFiles();
