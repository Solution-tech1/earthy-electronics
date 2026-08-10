const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

async function restoreOriginalImagesSafely() {
  console.log("==================================================");
  console.log("🔄 RESTORING ORIGINAL HIGH-QUALITY PRODUCT IMAGES SAFELY");
  console.log("🔒 RULE: PURE WHITE CANVAS FLATTEN ONLY; ZERO TOUCH TO APPLIANCE BODY");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Processing ${products.length} products...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  
  // Read ready CSV for original high-res image URLs
  const csvLines = fs.readFileSync(readyCsvPath, 'utf8').split('\n');
  const nameToOrigUrlMap = new Map();
  
  csvLines.forEach(line => {
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 6) {
      const mName = parts[3].toLowerCase();
      const imgUrl = parts[5];
      if (mName && imgUrl) {
        nameToOrigUrlMap.set(mName, imgUrl);
      }
    }
  });

  let restoredCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const modelKey = p.name.trim().toLowerCase();
    const origUrl = nameToOrigUrlMap.get(modelKey);

    const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const localFilename = `${slug}.jpg`;
    const imagesOutputDir = path.join(publicDir, 'images', 'products');
    if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

    const localAbsPath = path.join(imagesOutputDir, localFilename);
    const relativeWebPath = `/images/products/${localFilename}`;

    if (origUrl && origUrl.startsWith('http')) {
      try {
        const tempRawPath = path.join(imagesOutputDir, `temp_safe_${localFilename}`);
        const client = origUrl.startsWith('https') ? https : http;

        await new Promise((resolve, reject) => {
          const req = client.get(origUrl, (resp) => {
            if (resp.statusCode !== 200) {
              reject(new Error(`HTTP ${resp.statusCode}`));
              return;
            }
            const f = fs.createWriteStream(tempRawPath);
            resp.pipe(f);
            f.on('finish', () => { f.close(); resolve(); });
          });
          req.on('error', reject);
          req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
        });

        if (fs.existsSync(tempRawPath)) {
          // Flatten safely onto white canvas WITHOUT touching appliance body pixels
          await sharp(tempRawPath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 95 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRawPath);

          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          restoredCount++;
          console.log(`[${idx+1}/${products.length}] ✅ Safely Restored: [ID ${p.id}] ${p.name}`);
        } else {
          failedCount++;
        }

      } catch (err) {
        failedCount++;
        console.log(`[${idx+1}/${products.length}] ⚠️ Download skip [ID ${p.id}]: ${err.message}`);
      }
    } else {
      // Local image: flatten safely onto white canvas
      if (fs.existsSync(localAbsPath)) {
        try {
          const tempPath = path.join(imagesOutputDir, `temp_safe_loc_${localFilename}`);
          await sharp(localAbsPath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 95 })
            .toFile(tempPath);

          if (fs.existsSync(localAbsPath)) fs.unlinkSync(localAbsPath);
          fs.renameSync(tempPath, localAbsPath);

          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          restoredCount++;
          console.log(`[${idx+1}/${products.length}] ✅ Safely Processed Local: [ID ${p.id}] ${p.name}`);
        } catch (err) {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }
  }

  console.log("\n==================================================");
  console.log("📊 SAFE RESTORATION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ Safely Restored HD Product Images: ${restoredCount}`);
  console.log(`⚠️ Skipped/Failed: ${failedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

restoreOriginalImagesSafely().catch(console.error);
