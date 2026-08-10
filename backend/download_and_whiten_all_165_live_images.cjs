const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function downloadAndWhitenAllImages() {
  console.log("==================================================");
  console.log("🧼 DOWNLOADING & WHITENING ALL 165 PRODUCT IMAGES TO LOCAL PURE WHITE CUTOUTS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Processing images for ${products.length} live products...\n`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const rawImgUrl = p.image.trim();
    const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const localFilename = `${slug}.jpg`;
    const localAbsPath = path.join(imagesOutputDir, localFilename);
    const relativeWebPath = `/images/products/${localFilename}`;

    if (rawImgUrl.startsWith('http')) {
      try {
        const tempRawPath = path.join(imagesOutputDir, `temp_raw_${localFilename}`);
        const client = rawImgUrl.startsWith('https') ? https : http;

        await new Promise((resolve, reject) => {
          const req = client.get(rawImgUrl, (resp) => {
            if (resp.statusCode !== 200) {
              reject(new Error(`HTTP Status ${resp.statusCode}`));
              return;
            }
            const fileStream = fs.createWriteStream(tempRawPath);
            resp.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(); });
          });
          req.on('error', reject);
          req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
        });

        if (fs.existsSync(tempRawPath)) {
          // Process image with Sharp:
          // 1. Flatten against pure white background #FFFFFF
          // 2. Resize to 800x800 with white padding contain fit
          await sharp(tempRawPath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize(800, 800, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 95 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRawPath);

          // Update database to local relative path
          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          successCount++;
          console.log(`[${idx+1}/${products.length}] ✅ Downloaded & Whitened: [ID ${p.id}] ${p.name}`);
        }

      } catch (err) {
        failCount++;
        console.log(`[${idx+1}/${products.length}] ⚠️ Remote download error [ID ${p.id}] ${p.name}: ${err.message}`);
      }
    } else {
      // Local image file
      const localCurrentAbs = path.join(__dirname, '..', 'frontend', 'public', rawImgUrl.replace(/^\//, ''));

      if (fs.existsSync(localCurrentAbs)) {
        try {
          const tempPath = path.join(imagesOutputDir, `temp_loc_${localFilename}`);

          await sharp(localCurrentAbs)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize(800, 800, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 95 })
            .toFile(tempPath);

          if (fs.existsSync(localCurrentAbs) && localCurrentAbs !== tempPath) {
            fs.unlinkSync(localCurrentAbs);
          }
          fs.renameSync(tempPath, localAbsPath);

          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          successCount++;
          console.log(`[${idx+1}/${products.length}] ✅ Local Processed & Whitened: [ID ${p.id}] ${p.name}`);

        } catch (err) {
          failCount++;
          console.log(`[${idx+1}/${products.length}] ⚠️ Local Sharp error [ID ${p.id}]: ${err.message}`);
        }
      } else {
        failCount++;
      }
    }
  }

  console.log("\n==================================================");
  console.log("📊 ALL IMAGES LOCAL WHITENING COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ Successfully Processed onto Pure White Studio Backgrounds: ${successCount}`);
  console.log(`⚠️ Failed/Skipped: ${failCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

downloadAndWhitenAllImages().catch(console.error);
