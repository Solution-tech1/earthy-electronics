const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const imagesDir = path.join(__dirname, '../frontend/public/images/products');
const hashFile = path.join(__dirname, 'used_image_hashes.json');

function calculateMD5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

async function run() {
  const hashes = new Set();
  
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    for (const file of files) {
      if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')) {
        const filePath = path.join(imagesDir, file);
        try {
          const hash = calculateMD5(filePath);
          hashes.add(hash);
        } catch (e) {
          console.error(`Error hashing ${file}:`, e.message);
        }
      }
    }
  }

  fs.writeFileSync(hashFile, JSON.stringify(Array.from(hashes), null, 2));
  console.log(`Initialized ${hashes.size} unique image hashes for duplicate prevention.`);
}

run();
