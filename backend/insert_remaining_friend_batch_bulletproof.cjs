const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function insertRemainingFriendBatchBulletproof() {
  console.log("==================================================");
  console.log("🚀 BULLETPROOF INSERTION OF REMAINING FRIEND BATCH PRODUCTS");
  console.log("==================================================");

  const reportPath = path.join(__dirname, 'pre_upload_deduplication_results.json');
  if (!fs.existsSync(reportPath)) {
    console.error("Error: pre_upload_deduplication_results.json missing");
    return;
  }

  const { ready, alreadyLive } = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const friendListPath = path.join(__dirname, 'Friend_Batch_100_Products.md');
  const mdText = fs.readFileSync(friendListPath, 'utf8');
  const lines = mdText.split('\n').filter(l => l.startsWith('|') && !l.includes('Brand'));
  
  const priceMap = new Map();
  lines.forEach(l => {
    const parts = l.split('|').map(s => s.trim());
    if (parts.length >= 6) {
      const modelName = `${parts[2]} ${parts[4]}`.trim();
      const rateStr = parts[5].replace(/[^0-9]/g, '');
      if (rateStr) priceMap.set(modelName.toLowerCase(), parseInt(rateStr));
    }
  });

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  console.log("✅ Connected to MariaDB database: earthy_elec");

  const [dbProducts] = await connection.query("SELECT id, name, brand, category, price, image FROM products");
  const existingNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  // Compute MD5 hashes of all existing DB images
  const dbHashes = new Map();
  dbProducts.forEach(p => {
    if (p.image && p.image.startsWith('/images/products/')) {
      const abs = path.join(publicProductsDir, path.basename(p.image));
      if (fs.existsSync(abs)) {
        const hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
        dbHashes.set(hash, p.name);
      }
    }
  });

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedDuplicatesCount = 0;

  for (const item of ready) {
    const name = item.model;
    const lowerName = name.toLowerCase();

    // Double check model name uniqueness
    if (existingNames.has(lowerName)) {
      skippedDuplicatesCount++;
      console.log(`⚠️ Skipped duplicate model name: ${name}`);
      continue;
    }

    // Double check image MD5 hash uniqueness
    const imgFileName = path.basename(item.image);
    const imgAbsPath = path.join(publicProductsDir, imgFileName);

    if (fs.existsSync(imgAbsPath)) {
      const hash = crypto.createHash('md5').update(fs.readFileSync(imgAbsPath)).digest('hex');
      if (dbHashes.has(hash)) {
        skippedDuplicatesCount++;
        console.log(`⚠️ Skipped duplicate image hash for ${name} (Matches "${dbHashes.get(hash)}")`);
        continue;
      }
      dbHashes.set(hash, name);
    }

    const brand = name.split(' ')[0] || 'Generic';
    const category = item.category || 'General';
    const price = priceMap.get(lowerName) || 35000;
    const discountPrice = Math.round(price * 0.94);
    const image = item.image;
    const description = `Official ${name} with full manufacturer warranty. Available for immediate delivery in Karachi.`;
    const stock = 15;

    const [res] = await connection.query(
      "INSERT INTO products (name, brand, category, price, discountPrice, image, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [name, brand, category, price, discountPrice, image, description, stock]
    );

    existingNames.add(lowerName);
    insertedCount++;
    console.log(`✅ Inserted DB ID #${res.insertId}: ${name}`);
  }

  // Update existing products without duplicating
  for (const item of alreadyLive) {
    const name = item.model;
    const price = priceMap.get(name.toLowerCase()) || 40000;
    const discountPrice = Math.round(price * 0.94);

    await connection.query(
      "UPDATE products SET price = ?, discountPrice = ? WHERE id = ?",
      [price, discountPrice, item.existingId]
    );
    updatedCount++;
    console.log(`🔄 Updated existing DB ID #${item.existingId}: ${name}`);
  }

  const [totalRes] = await connection.query("SELECT COUNT(*) as cnt FROM products");
  console.log("\n==================================================");
  console.log("🎉 BULLETPROOF LIVE INSERTION COMPLETE");
  console.log("==================================================");
  console.log(`✅ Total New Products Inserted: ${insertedCount}`);
  console.log(`🔄 Total Existing Products Updated: ${updatedCount}`);
  console.log(`🛑 Skipped Duplicate Conflicts: ${skippedDuplicatesCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${totalRes[0].cnt}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

insertRemainingFriendBatchBulletproof();
