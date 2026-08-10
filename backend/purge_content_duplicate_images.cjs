const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getFileHash(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const fileBuffer = fs.readFileSync(absPath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function purgeContentDuplicates() {
  console.log("==================================================");
  console.log("🚨 STRICT IMAGE CONTENT HASH AUDIT & DUPLICATE CONTENT PURGE");
  console.log("🔒 RULE: ZERO IDENTICAL PICTURE CONTENT ALLOWED ACROSS DIFFERENT MODELS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Auditing image content hashes for ${products.length} products with active images...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  // Map image content hash -> array of product IDs using it
  const hashToProductsMap = new Map();

  for (const p of products) {
    const relativePath = p.image.replace(/^\//, '');
    const absPath = path.join(publicDir, relativePath);
    const fileHash = getFileHash(absPath);

    if (fileHash) {
      if (!hashToProductsMap.has(fileHash)) {
        hashToProductsMap.set(fileHash, []);
      }
      hashToProductsMap.get(fileHash).push({ id: p.id, name: p.name, image: p.image });
    }
  }

  console.log(`Unique Image Content Hashes Found: ${hashToProductsMap.size}\n`);

  let keptCount = 0;
  let clearedCount = 0;

  for (const [hash, productList] of hashToProductsMap.entries()) {
    if (productList.length > 1) {
      console.log(`⚠️ SHARED IMAGE CONTENT (Hash: ${hash.substring(0, 8)}...): Used by ${productList.length} models:`);
      productList.forEach((item, index) => {
        console.log(`   [${index+1}] ID ${item.id}: ${item.name} (${item.image})`);
      });

      // Keep ONLY the first primary product, reset all secondary duplicates to ""
      const primary = productList[0];
      keptCount++;
      console.log(`   ✅ KEPT for Primary: [ID ${primary.id}] ${primary.name}`);

      for (let i = 1; i < productList.length; i++) {
        const dup = productList[i];
        await db.execute('UPDATE products SET image = "" WHERE id = ?', [dup.id]);
        clearedCount++;
        console.log(`   ❌ CLEARED DUPLICATE CONTENT to '': [ID ${dup.id}] ${dup.name}`);
      }
      console.log("");
    } else {
      keptCount++;
    }
  }

  console.log("\n==================================================");
  console.log("📊 CONTENT HASH AUDIT COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ Truly Unique 1-to-1 Product Images Kept: ${keptCount}`);
  console.log(`❌ Duplicate Image Content Cleared to '': ${clearedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

purgeContentDuplicates().catch(console.error);
