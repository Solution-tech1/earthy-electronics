const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function purgeRandomImages() {
  console.log("==================================================");
  console.log("🚨 EMERGENCY PURGE OF ALL UNRELATED / RANDOM / WEBSCRAPE IMAGES");
  console.log("🔒 STRICT RULE: ONLY REAL LOCAL CUTOUTS ALLOWED; ALL OTHERS RESET TO ''");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products');
  console.log(`Auditing current ${products.length} products in database...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  let clearedCount = 0;
  let keptCount = 0;

  for (const p of products) {
    const img = (p.image || '').trim();

    if (!img) {
      continue;
    }

    let isSafe = false;

    // A valid image MUST be a local file path inside /images/ or /images/products/
    // AND must NOT be a price number, web link, or random downloaded file from earlier search
    if (img.startsWith('/images/products/haier-hrf-') && img.endsWith('.jpg')) {
      // Verified downloaded Haier Refrigerator image from pak-electronics.pk
      const absPath = path.join(publicDir, img.replace(/^\//, ''));
      if (fs.existsSync(absPath)) isSafe = true;
    } else if (img === '/images/tcl_smart_tv.png' || img === '/images/samsung_qled_tv.png' || img === '/images/samsung_eco_bubble_washer.png' || img === '/images/orient_water_dispenser.png' || img === '/images/ecostar_inverter_ac.png' || img === '/images/dawlance_water_dispenser.png' || img === '/images/dawlance_microwave_oven.png') {
      const absPath = path.join(publicDir, img.replace(/^\//, ''));
      if (fs.existsSync(absPath)) isSafe = true;
    }

    if (!isSafe) {
      // Reset image to empty string ""
      await db.execute('UPDATE products SET image = "" WHERE id = ?', [p.id]);
      clearedCount++;
      console.log(`❌ [ID ${p.id}] ${p.name} -> CLEARED RANDOM IMAGE ("${img}")`);
    } else {
      keptCount++;
      console.log(`✅ [ID ${p.id}] ${p.name} -> KEPT VERIFIED IMAGE ("${img}")`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 PURGE COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ KEPT VERIFIED IMAGES: ${keptCount}`);
  console.log(`❌ CLEARED UNRELATED/RANDOM IMAGES TO '': ${clearedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

purgeRandomImages().catch(console.error);
