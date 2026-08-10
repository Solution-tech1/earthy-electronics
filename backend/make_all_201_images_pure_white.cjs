const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function makeAllImagesPureWhite() {
  console.log("==================================================");
  console.log("🧼 CONVERTING ALL 201 PRODUCT IMAGES TO 100% PURE WHITE BACKGROUND (#FFFFFF)");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Processing ${products.length} products...\n`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let successCount = 0;
  let errorCount = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const rawImg = p.image.trim();
    const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const localFilename = `${slug}.jpg`;
    const localAbsPath = path.join(imagesOutputDir, localFilename);
    const relativeWebPath = `/images/products/${localFilename}`;

    try {
      let rawBuffer = null;

      if (rawImg.startsWith('data:image')) {
        // Base64 image
        const base64Data = rawImg.replace(/^data:image\/\w+;base64,/, '');
        rawBuffer = Buffer.from(base64Data, 'base64');
      } else if (rawImg.startsWith('http')) {
        // Remote URL download
        const tempPath = path.join(imagesOutputDir, `temp_dl_${localFilename}`);
        const client = rawImg.startsWith('https') ? https : http;

        await new Promise((resolve, reject) => {
          const req = client.get(rawImg, (resp) => {
            if (resp.statusCode !== 200) {
              reject(new Error(`HTTP ${resp.statusCode}`));
              return;
            }
            const f = fs.createWriteStream(tempPath);
            resp.pipe(f);
            f.on('finish', () => { f.close(); resolve(); });
          });
          req.on('error', reject);
          req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        });

        if (fs.existsSync(tempPath)) {
          rawBuffer = fs.readFileSync(tempPath);
          fs.unlinkSync(tempPath);
        }
      } else {
        // Local file
        const currentAbs = path.join(__dirname, '..', 'frontend', 'public', rawImg.replace(/^\//, ''));
        if (fs.existsSync(currentAbs)) {
          rawBuffer = fs.readFileSync(currentAbs);
        }
      }

      if (rawBuffer) {
        // Process through Sharp:
        // 1. Flatten to pure white background #FFFFFF
        // 2. Resize to 800x800 canvas with white background padding & contain fit
        await sharp(rawBuffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize(800, 800, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .jpeg({ quality: 95 })
          .toFile(localAbsPath);

        // Update database to local relative path
        await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
        successCount++;
        console.log(`[${idx+1}/${products.length}] ✅ Converted to Pure White BG: [ID ${p.id}] ${p.name}`);
      } else {
        errorCount++;
        console.log(`[${idx+1}/${products.length}] ⚠️ Buffer missing for [ID ${p.id}] ${p.name}`);
      }

    } catch (err) {
      errorCount++;
      console.log(`[${idx+1}/${products.length}] ⚠️ Error processing [ID ${p.id}] ${p.name}: ${err.message}`);
    }

    await delay(50);
  }

  console.log("\n==================================================");
  console.log("📊 PURE WHITE BACKGROUND CONVERSION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ Successfully Converted onto Pure White (#FFFFFF) Canvas: ${successCount}`);
  console.log(`⚠️ Errors/Skipped: ${errorCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

makeAllImagesPureWhite().catch(console.error);
