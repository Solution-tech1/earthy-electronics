const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function purgeAllDuplicateImagesStrict() {
  console.log("==================================================");
  console.log("🧹 STRICT PURGE OF ALL DUPLICATE & SHARED IMAGES IN DATABASE");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''");
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  console.log(`🔍 Total Products with Images Checked: ${products.length}`);

  // 1. Group products by exact image URL path string
  const urlGroups = new Map();
  products.forEach(p => {
    const list = urlGroups.get(p.image) || [];
    list.push(p);
    urlGroups.set(p.image, list);
  });

  // 2. Group products by image MD5 byte hash
  const hashGroups = new Map();
  products.forEach(p => {
    if (p.image && p.image.startsWith('/images/products/')) {
      const fname = path.basename(p.image);
      const absPath = path.join(publicProductsDir, fname);
      if (fs.existsSync(absPath)) {
        try {
          const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');
          const list = hashGroups.get(hash) || [];
          list.push(p);
          hashGroups.set(hash, list);
        } catch (e) {}
      }
    }
  });

  let duplicateUrlsCleaned = 0;
  let duplicateHashesCleaned = 0;

  // Process Duplicate URL Groups: Keep ONLY the 1st product, set image = NULL for all duplicates!
  for (const [url, group] of urlGroups.entries()) {
    if (group.length > 1) {
      console.log(`\n⚠️ Found ${group.length} products sharing URL: ${url}`);
      console.log(`   Keeping Image for: ID #${group[0].id} ("${group[0].name}")`);
      for (let i = 1; i < group.length; i++) {
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [group[i].id]);
        console.log(`   ❌ Removed Duplicate Image from: ID #${group[i].id} ("${group[i].name}")`);
        duplicateUrlsCleaned++;
      }
    }
  }

  // Process Duplicate Hash Groups: Keep ONLY the 1st product, set image = NULL for all duplicates!
  for (const [hash, group] of hashGroups.entries()) {
    if (group.length > 1) {
      // Find items that still have an image after URL cleanup
      const [currentGroup] = await connection.query(
        "SELECT id, name, image FROM products WHERE id IN (?) AND image IS NOT NULL AND image != ''",
        [group.map(g => g.id)]
      );

      if (currentGroup.length > 1) {
        console.log(`\n⚠️ Found ${currentGroup.length} products sharing byte hash: ${hash}`);
        console.log(`   Keeping Image for: ID #${currentGroup[0].id} ("${currentGroup[0].name}")`);
        for (let i = 1; i < currentGroup.length; i++) {
          await connection.query("UPDATE products SET image = NULL WHERE id = ?", [currentGroup[i].id]);
          console.log(`   ❌ Removed Duplicate Image from: ID #${currentGroup[i].id} ("${currentGroup[i].name}")`);
          duplicateHashesCleaned++;
        }
      }
    }
  }

  const [finalProducts] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");
  
  console.log("\n==================================================");
  console.log("🎉 STRICT DUPLICATE IMAGE PURGE COMPLETE");
  console.log("==================================================");
  console.log(`🧹 Duplicate URL Pointers Removed: ${duplicateUrlsCleaned}`);
  console.log(`🧹 Duplicate Hash Pointers Removed: ${duplicateHashesCleaned}`);
  console.log(`🛒 Total Active Products in DB: ${finalProducts[0].total}`);
  console.log(`✨ Total Products with 100% UNIQUE HD Cutouts: ${finalProducts[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeAllDuplicateImagesStrict();
