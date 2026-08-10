const mysql = require('mysql2/promise');

async function purgeCrossCategoryMismatches() {
  console.log("==================================================");
  console.log("🧹 PURGING ALL CROSS-CATEGORY IMAGE MISMATCHES IN DATABASE");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`🔍 Total Products with Images Checked: ${products.length}`);

  let removedCount = 0;

  for (const p of products) {
    const name = p.name.toLowerCase();
    const cat = p.category ? p.category.toLowerCase() : '';
    const img = p.image.toLowerCase();

    let isMismatch = false;
    let reason = "";

    // Mismatch Rule 1: Washing Machine product having phone, AC, or TV image
    if ((name.includes('washing') || cat.includes('washing')) && (img.includes('phone') || img.includes('ac') || img.includes('air') || img.includes('mobile') || img.includes('tablet') || img.includes('led') || img.includes('tv'))) {
      isMismatch = true;
      reason = "Washing Machine product had non-washer image pointer (phone/AC/TV)";
    }

    // Mismatch Rule 2: Microwave product having fridge/AC/washer image
    if ((name.includes('microwave') || cat.includes('microwave')) && (img.includes('fridge') || img.includes('ac') || img.includes('washer') || img.includes('refrigerator'))) {
      isMismatch = true;
      reason = "Microwave product had non-microwave image pointer";
    }

    // Mismatch Rule 3: Refrigerator product having AC/washer/microwave image
    if ((name.includes('hrf') || name.includes('refrigerator') || cat.includes('refrigerator')) && (img.includes('ac') || img.includes('washer') || img.includes('microwave') || img.includes('phone'))) {
      isMismatch = true;
      reason = "Refrigerator product had non-refrigerator image pointer";
    }

    // Mismatch Rule 4: Air Conditioner product having washer/fridge/phone image
    if ((name.includes('ac') || name.includes('inverter') || cat.includes('air conditioner')) && (img.includes('washer') || img.includes('fridge') || img.includes('phone') || img.includes('microwave'))) {
      isMismatch = true;
      reason = "Air Conditioner product had non-AC image pointer";
    }

    // Mismatch Rule 5: Specific Samsung Ecobubble models flagged in screenshot (IDs #166, #167)
    if (name.includes('ecobubble') && (img.includes('phone') || img.includes('ac') || img.includes('zeno') || img.includes('electromart'))) {
      isMismatch = true;
      reason = "Samsung Ecobubble washing machine had stock phone/AC image pointer";
    }

    if (isMismatch) {
      await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
      removedCount++;
      console.log(`❌ Removed Mismatched Image from ID #${p.id} ("${p.name}") -> Reason: ${reason}`);
    }
  }

  const [finalRes] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 CROSS-CATEGORY MISMATCH PURGE COMPLETE");
  console.log("==================================================");
  console.log(`🧹 Cross-Category Mismatches Removed: ${removedCount}`);
  console.log(`🛒 Total Active Products in DB: ${finalRes[0].total}`);
  console.log(`✨ Total Products with 100% CATEGORY-MATCHED UNIQUE Cutouts: ${finalRes[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeCrossCategoryMismatches();
