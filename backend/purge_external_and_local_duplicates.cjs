const mysql = require('mysql2/promise');

async function purgeExternalAndLocalDuplicates() {
  console.log("==================================================");
  console.log("🧹 PURGING ALL EXTERNAL & LOCAL DUPLICATE PRODUCT IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");

  console.log(`🔍 Total Products with Images Checked: ${products.length}`);

  const seenImages = new Map();
  const duplicatesToRemove = [];

  for (const p of products) {
    let imgKey = p.image.trim();
    
    // Normalize URL query params
    if (imgKey.includes('?')) {
      imgKey = imgKey.split('?')[0];
    }

    if (seenImages.has(imgKey)) {
      const original = seenImages.get(imgKey);
      duplicatesToRemove.push({
        duplicateId: p.id,
        duplicateName: p.name,
        originalId: original.id,
        originalName: original.name,
        url: imgKey
      });
    } else {
      seenImages.set(imgKey, p);
    }
  }

  // Also check microwave specific shared cutouts (e.g. Haier HMW-20 series)
  const microwaveProducts = products.filter(p => p.category && p.category.toLowerCase().includes('microwave'));
  const microwaveImageMap = new Map();
  for (const m of microwaveProducts) {
    const key = m.image;
    if (microwaveImageMap.has(key)) {
      duplicatesToRemove.push({
        duplicateId: m.id,
        duplicateName: m.name,
        originalId: microwaveImageMap.get(key).id,
        originalName: microwaveImageMap.get(key).name,
        url: key
      });
    } else {
      microwaveImageMap.set(key, m);
    }
  }

  // Deduplicate array
  const uniqueIdsToRemove = [...new Set(duplicatesToRemove.map(d => d.duplicateId))];

  console.log(`\n⚠️ Found ${uniqueIdsToRemove.length} duplicate image assignments to remove!`);

  for (const id of uniqueIdsToRemove) {
    await connection.query("UPDATE products SET image = NULL WHERE id = ?", [id]);
    console.log(`❌ Removed Duplicate Image Pointer from Product ID #${id}`);
  }

  const [finalRes] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 EXTERNAL & LOCAL DUPLICATE PURGE COMPLETE");
  console.log("==================================================");
  console.log(`🧹 Duplicate Product Images Removed: ${uniqueIdsToRemove.length}`);
  console.log(`🛒 Total Active Products in DB: ${finalRes[0].total}`);
  console.log(`✨ Total Products with 100% TRULY UNIQUE Cutouts: ${finalRes[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeExternalAndLocalDuplicates();
