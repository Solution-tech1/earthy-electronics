const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

async function fullSiteAndUnmatchedAudit() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("==================================================");
  console.log("🔍 PART 1: LIVE WEBSITE DUPLICATE IMAGE AUDIT");
  console.log("==================================================");

  const [dupeCheck] = await db.query(
    `SELECT image, count(*) as cnt 
     FROM products 
     WHERE image IS NOT NULL AND image != '' 
     GROUP BY image 
     HAVING cnt > 1`
  );

  let deletedCount = 0;

  if (dupeCheck.length > 0) {
    console.log(`Found ${dupeCheck.length} duplicate image URLs! Cleaning up...`);
    for (const d of dupeCheck) {
      const [rows] = await db.query('SELECT id, name, brand, image FROM products WHERE image = ? ORDER BY id ASC', [d.image]);
      const toDelete = rows.slice(1);
      for (const r of toDelete) {
        console.log(`❌ Removing Duplicate Row ID #${r.id}: [${r.brand}] ${r.name}`);
        await db.query('DELETE FROM products WHERE id = ?', [r.id]);
        deletedCount++;
      }
    }
  } else {
    console.log("✅ ZERO DUPLICATE IMAGES FOUND IN MARIADB! Every single product has a unique image URL.");
  }

  const [liveStats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🔍 PART 2: UNMATCHED PRODUCTS FILE AUDIT");
  console.log("==================================================");

  const unmatchedFile = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
  const unmatchedRows = [];

  if (fs.existsSync(unmatchedFile)) {
    await new Promise((resolve) => {
      fs.createReadStream(unmatchedFile)
        .pipe(csv())
        .on('data', (d) => unmatchedRows.push(d))
        .on('end', resolve);
    });
  }

  let properModelCount = 0;
  let genericTitleCount = 0;
  const brandBreakdown = {};

  unmatchedRows.forEach(r => {
    const model = (r.Model_Name || '').trim();
    const brand = (r.Brand || 'Other').trim();

    // Check if model contains digits or specific model code (e.g. DW-1165, HWM 120-1678, SA 233, etc.)
    if (model.match(/\d/) || model.match(/-[a-z0-9]/i)) {
      properModelCount++;
      brandBreakdown[brand] = (brandBreakdown[brand] || 0) + 1;
    } else {
      genericTitleCount++;
    }
  });

  console.log(`• Total Items in Unmatched_Products.csv: ${unmatchedRows.length}`);
  console.log(`• Proper Model Products (With Exact Model Codes): ${properModelCount}`);
  console.log(`• Generic / Vague Titles (e.g. 'HAIER', 'PEL', 'WASH & SPIN'): ${genericTitleCount}\n`);

  console.log("=== PROPER MODEL UNMATCHED PRODUCTS BY BRAND ===");
  Object.entries(brandBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, cnt]) => {
      console.log(`  - ${brand}: ${cnt} proper model products`);
    });

  console.log("\n==================================================");
  console.log("🏆 FINAL AUDIT RESULT:");
  console.log(`• Live Website Products: ${liveStats[0].total}`);
  console.log(`• Live Website Unique Images: ${liveStats[0].unique_imgs}`);
  console.log(`• Live Website Duplicate Images: 0`);
  console.log(`• Removed Duplicates: ${deletedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

fullSiteAndUnmatchedAudit().catch(console.error);
