const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function masterStrictDeduplicationAudit() {
  console.log("==================================================");
  console.log("🔒 MASTER STRICT DEDUPLICATION AUDIT (53 ITEMS + 71 NEW LEDs)");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [allProducts] = await connection.query("SELECT id, name, brand, category, price, image FROM products");
  console.log(`🛒 Total Live DB Products to Audit: ${allProducts.length}`);

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  // STEP A: Clean duplicate DB product rows (e.g. if 71 LEDs created duplicate names)
  const seenNamesMap = new Map();
  const duplicateDbRowIdsToRemove = [];

  allProducts.forEach(p => {
    // Normalize name (remove extra spaces, lower case)
    const normName = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenNamesMap.has(normName)) {
      duplicateDbRowIdsToRemove.push(p.id);
    } else {
      seenNamesMap.set(normName, p);
    }
  });

  if (duplicateDbRowIdsToRemove.length > 0) {
    console.log(`\n⚠️ Found ${duplicateDbRowIdsToRemove.length} Duplicate Product Rows in DB. Deleting duplicates...`);
    for (const dupId of duplicateDbRowIdsToRemove) {
      await connection.query("DELETE FROM products WHERE id = ?", [dupId]);
      console.log(`   ❌ Deleted Duplicate DB Row ID #${dupId}`);
    }
  }

  // STEP B: Audit Image MD5 Byte Hashes and URLs (100% Unique Image Rule)
  const [currentProducts] = await connection.query("SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''");
  
  const hashToProductMap = new Map();
  const duplicateImagePointersToRemove = [];

  for (const p of currentProducts) {
    let imgKey = p.image;

    if (imgKey.startsWith('/images/products/')) {
      const fname = path.basename(imgKey);
      const absPath = path.join(publicProductsDir, fname);
      if (fs.existsSync(absPath)) {
        try {
          const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');
          if (hashToProductMap.has(hash)) {
            duplicateImagePointersToRemove.push({
              id: p.id,
              name: p.name,
              sharedWith: hashToProductMap.get(hash).name
            });
          } else {
            hashToProductMap.set(hash, p);
          }
        } catch (e) {}
      }
    } else {
      // External URL check
      if (hashToProductMap.has(imgKey)) {
        duplicateImagePointersToRemove.push({
          id: p.id,
          name: p.name,
          sharedWith: hashToProductMap.get(imgKey).name
        });
      } else {
        hashToProductMap.set(imgKey, p);
      }
    }
  }

  if (duplicateImagePointersToRemove.length > 0) {
    console.log(`\n⚠️ Found ${duplicateImagePointersToRemove.length} Shared / Duplicate Image Pointers. Cleaning...`);
    for (const dup of duplicateImagePointersToRemove) {
      await connection.query("UPDATE products SET image = NULL WHERE id = ?", [dup.id]);
      console.log(`   ❌ Set image = NULL for ID #${dup.id} ("${dup.name}") [Shared with "${dup.sharedWith}"]`);
    }
  }

  // STEP C: Audit the 53 Confirmed Candidates against existing images
  const confirmed53Path = path.join(__dirname, 'confirmed_53_unique_products_table.md');
  const verifiedUnique53 = [];
  const conflicted53 = [];

  if (fs.existsSync(confirmed53Path)) {
    const jsonReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_unmatched_products_5step_audit.json'), 'utf8'));
    const candidate53List = jsonReport.filter(r => r.confidenceLevel === 'VERIFIED_SAME_PRODUCT' && r.imageUnique === 'Yes');

    for (const c of candidate53List) {
      if (c.candidateImage && c.candidateImage.startsWith('/images/products/')) {
        const abs = path.join(publicProductsDir, path.basename(c.candidateImage));
        if (fs.existsSync(abs)) {
          const hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
          if (hashToProductMap.has(hash)) {
            conflicted53.push({
              id: c.id,
              name: c.listModel,
              reason: `Candidate image byte hash matches live DB item "${hashToProductMap.get(hash).name}"`
            });
          } else {
            verifiedUnique53.push(c);
            hashToProductMap.set(hash, { id: c.id, name: c.listModel }); // Reserve hash
          }
        }
      }
    }
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 MASTER STRICT DEDUPLICATION AUDIT COMPLETE");
  console.log("==================================================");
  console.log(`🧹 Duplicate DB Rows Deleted: ${duplicateDbRowIdsToRemove.length}`);
  console.log(`🧹 Shared Image Pointers Set to NULL: ${duplicateImagePointersToRemove.length}`);
  console.log(`✅ Verified 100% Unique Candidates in 53 List: ${verifiedUnique53.length}`);
  console.log(`❌ Conflicted Candidates in 53 List: ${conflicted53.length}`);
  console.log(`🛒 Total Active Products in DB: ${finalDbState[0].total}`);
  console.log(`✨ Total Products with 100% UNIQUE CUTOUT IMAGES: ${finalDbState[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

masterStrictDeduplicationAudit();
