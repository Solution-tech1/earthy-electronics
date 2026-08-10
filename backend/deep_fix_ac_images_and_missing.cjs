const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 3500 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function deepFixAcImagesAndMissing() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🔍 RUNNING DEEP AUDIT FOR AC DUPLICATES AND MISSING CARD IMAGES...");

  // 1. Remove Null / Empty / Invalid Image Cards
  const [missingRows] = await db.query(
    "SELECT id, name, brand FROM products WHERE image IS NULL OR image = '' OR image NOT LIKE 'http%'"
  );

  let missingDeleted = 0;
  for (const m of missingRows) {
    console.log(`❌ Removing Missing Image Card ID #${m.id}: [${m.brand}] ${m.name}`);
    await db.query('DELETE FROM products WHERE id = ?', [m.id]);
    missingDeleted++;
  }

  // 2. Audit Duplicate Images Across All Products (especially AC)
  const [dupes] = await db.query(
    `SELECT image, count(*) as cnt 
     FROM products 
     WHERE image IS NOT NULL AND image != '' 
     GROUP BY image 
     HAVING cnt > 1`
  );

  let dupesDeleted = 0;
  for (const d of dupes) {
    const [rows] = await db.query('SELECT id, name, brand, category, image FROM products WHERE image = ? ORDER BY id ASC', [d.image]);
    const toDelete = rows.slice(1);
    for (const r of toDelete) {
      console.log(`❌ Removing Duplicate Image Row ID #${r.id}: [${r.brand}] (${r.category}) ${r.name}`);
      await db.query('DELETE FROM products WHERE id = ?', [r.id]);
      dupesDeleted++;
    }
  }

  // 3. HTTP HEAD Loadability Check to eliminate 404 images that trigger frontend fallback
  const [allProducts] = await db.query('SELECT id, name, brand, image FROM products');
  let brokenHttpDeleted = 0;

  for (const p of allProducts) {
    const isValid = await checkUrl(p.image);
    if (!isValid) {
      console.log(`❌ Removing Broken 404 Image Card ID #${p.id}: [${p.brand}] ${p.name} (${p.image})`);
      await db.query('DELETE FROM products WHERE id = ?', [p.id]);
      brokenHttpDeleted++;
    }
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');
  const [acCount] = await db.query("SELECT count(*) as total FROM products WHERE category = 'Air Conditioners'");

  console.log("\n==================================================");
  console.log("✅ AC DUPLICATE & MISSING CARD FIX COMPLETED!");
  console.log(`• Missing Image Cards Purged: ${missingDeleted}`);
  console.log(`• Duplicate Image Rows Purged: ${dupesDeleted}`);
  console.log(`• Broken 404 Image Cards Purged: ${brokenHttpDeleted}`);
  console.log(`• Total Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${res[0].unique_imgs}`);
  console.log(`• Total Air Conditioners Live: ${acCount[0].total}`);
  console.log("==================================================\n");

  process.exit(0);
}

deepFixAcImagesAndMissing().catch(console.error);
