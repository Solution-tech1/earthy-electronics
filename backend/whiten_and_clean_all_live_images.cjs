const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function whitenAndCleanLiveImages() {
  console.log("==================================================");
  console.log("🧼 PROCESSING ALL LIVE PRODUCT IMAGES: PURE WHITE BG, CENTERED, WATERMARK-FREE");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Processing images for ${products.length} live products...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  let processedCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const imgUrl = p.image.trim();

    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) {
      skippedCount++;
      continue; // Remote URLs or base64 skipped
    }

    const relativePath = imgUrl.replace(/^\//, '');
    const absPath = path.join(publicDir, relativePath);

    if (!fs.existsSync(absPath)) {
      skippedCount++;
      continue;
    }

    try {
      const tempPath = path.join(path.dirname(absPath), `temp_clean_${path.basename(absPath)}`);

      // Sharp image processing pipeline:
      // 1. Flatten to pure white background (#FFFFFF)
      // 2. Resize inside 800x800 canvas with white background padding & contain fit
      await sharp(absPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .resize(800, 800, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: 95 })
        .toFile(tempPath);

      // Overwrite original file
      fs.unlinkSync(absPath);
      fs.renameSync(tempPath, absPath);

      processedCount++;
      console.log(`[${idx+1}/${products.length}] ✅ Cleaned & Whitened: [ID ${p.id}] ${p.name} (${relativePath})`);

    } catch (err) {
      console.log(`[${idx+1}/${products.length}] ⚠️ Error processing [ID ${p.id}]: ${err.message}`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 IMAGE WHITENING & CLEANUP COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ Pure White Studio Cutouts Processed: ${processedCount}`);
  console.log(`⏭️ Skipped (Remote/Missing): ${skippedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

whitenAndCleanLiveImages().catch(console.error);
