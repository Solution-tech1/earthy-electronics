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

async function deleteProductsWithoutExactImages() {
  console.log("==================================================");
  console.log("🚨 STRICT PURGE: DELETING ALL PRODUCT ROWS THAT LACK AN EXACT UNIQUE IMAGE");
  console.log("🔒 RULE: ONLY PRODUCTS WITH 100% UNIQUE REAL IMAGES REMAIN IN DB");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // 1. Delete products with empty image string
  const [emptyDelResult] = await db.query('DELETE FROM products WHERE image IS NULL OR TRIM(image) = ""');
  console.log(`❌ Deleted ${emptyDelResult.affectedRows} product rows that had empty image ("")`);

  // 2. Delete products using category fallback image paths
  const [fallbackDelResult] = await db.query(
    `DELETE FROM products WHERE image LIKE '%cat_%' OR image LIKE '%placeholder%' OR image LIKE '%product_dispenser%' OR image LIKE '%product_freezer%'`
  );
  console.log(`❌ Deleted ${fallbackDelResult.affectedRows} product rows that used generic category fallbacks`);

  // 3. Audit remaining products for duplicate image content (file hashes or identical URL strings)
  const [remaining] = await db.query('SELECT id, name, category, brand, image FROM products');
  console.log(`Auditing remaining ${remaining.length} products for duplicate content/urls...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  const seenUrls = new Set();
  const seenHashes = new Set();
  const idsToDelete = [];

  for (const p of remaining) {
    const imgUrl = (p.image || '').trim();

    // Check duplicate URL
    if (seenUrls.has(imgUrl)) {
      idsToDelete.push(p.id);
      console.log(`❌ Flagged for Delete (Duplicate URL): [ID ${p.id}] ${p.name} -> "${imgUrl}"`);
      continue;
    }

    // Check file content hash if local image
    if (!imgUrl.startsWith('http')) {
      const relativePath = imgUrl.replace(/^\//, '');
      const absPath = path.join(publicDir, relativePath);
      const fileHash = getFileHash(absPath);

      if (fileHash) {
        if (seenHashes.has(fileHash)) {
          idsToDelete.push(p.id);
          console.log(`❌ Flagged for Delete (Duplicate Image Content Hash): [ID ${p.id}] ${p.name}`);
          continue;
        }
        seenHashes.add(fileHash);
      }
    }

    seenUrls.add(imgUrl);
  }

  if (idsToDelete.length > 0) {
    await db.query(`DELETE FROM products WHERE id IN (?)`, [idsToDelete]);
    console.log(`\n❌ Deleted ${idsToDelete.length} duplicate-image product rows from DB`);
  }

  // 4. Final DB Count
  const [finalRows] = await db.query('SELECT id, name, category, brand, image FROM products');

  console.log("\n==================================================");
  console.log("📊 STRICT PURGE COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ TOTAL PURE PRODUCTS REMAINING ON SITE (ALL WITH UNIQUE EXACT IMAGES): ${finalRows.length}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

deleteProductsWithoutExactImages().catch(console.error);
