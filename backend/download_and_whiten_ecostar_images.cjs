const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 6000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 400) return resolve(false);
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => { fileStream.close(); resolve(true); });
      fileStream.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function downloadAndWhitenEcostarImages() {
  console.log("==================================================");
  console.log("🧼 DOWNLOADING & WHITENING ALL ECOSTAR IMAGES TO PURE WHITE #FFFFFF...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const imagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const [rows] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE LOWER(brand) LIKE '%ecostar%' OR LOWER(name) LIKE '%ecostar%'`
  );

  let updatedCount = 0;

  for (const r of rows) {
    const slug = `ecostar-model-${r.id}`;
    const rawFileName = `${slug}_raw.png`;
    const cleanFileName = `${slug}.png`;

    const rawPath = path.join(imagesDir, rawFileName);
    const cleanPath = path.join(imagesDir, cleanFileName);
    const relativeUrl = `/images/${cleanFileName}`;

    if (r.image.startsWith('http')) {
      const ok = await downloadImage(r.image, rawPath);
      if (ok && fs.existsSync(rawPath)) {
        try {
          await sharp(rawPath)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 95 })
            .toFile(cleanPath);
        } catch (e) {
          fs.copyFileSync(rawPath, cleanPath);
        }

        try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch (e) {}

        await db.execute(
          `UPDATE products SET image = ? WHERE id = ?`,
          [relativeUrl, r.id]
        );

        updatedCount++;
        console.log(`✨ WHITENED & UPDATED [#${r.id}]: ${r.name} -> ${relativeUrl}`);
      }
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 ECOSTAR IMAGES CLEAN & UNIQUE SYNC COMPLETE!");
  console.log(`• Total EcoStar Products Processed: ${updatedCount}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

downloadAndWhitenEcostarImages().catch(console.error);
