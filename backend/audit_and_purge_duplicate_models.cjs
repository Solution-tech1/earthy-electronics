const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function auditAndPurgeDuplicateModels() {
  console.log("==================================================");
  console.log("🔍 AUDITING & PURGING DUPLICATE MODEL ROWS IN MARIADB");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, price FROM products ORDER BY id ASC");
  console.log(`🛒 Total Live Products in DB before Deduplication: ${products.length}`);

  const modelMap = new Map();
  const duplicatesList = [];
  const idsToDelete = [];

  products.forEach(p => {
    // Normalize model name (remove extra spaces, lower case)
    const normKey = p.name.toLowerCase().replace(/\s+/g, ' ').trim();

    if (modelMap.has(normKey)) {
      const original = modelMap.get(normKey);
      idsToDelete.push(p.id);
      duplicatesList.push({
        dupId: p.id,
        retainedId: original.id,
        modelName: p.name,
        brand: p.brand,
        category: p.category
      });
    } else {
      modelMap.set(normKey, p);
    }
  });

  console.log(`\n==================================================`);
  console.log(`📊 DEDUPLICATION AUDIT SUMMARY`);
  console.log(`==================================================`);
  console.log(`🛒 Total Products Before Deduplication: ${products.length}`);
  console.log(`✨ Unique Model Count: ${modelMap.size}`);
  console.log(`❌ Duplicate Model Rows Found to Purge: ${idsToDelete.length}`);
  console.log(`==================================================\n`);

  // Delete duplicate rows from DB
  if (idsToDelete.length > 0) {
    for (const id of idsToDelete) {
      await connection.query("DELETE FROM products WHERE id = ?", [id]);
    }
    console.log(`🧹 Successfully purged ${idsToDelete.length} duplicate model rows from MariaDB.`);
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");
  const [catSummary] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");

  console.log("\n==================================================");
  console.log("🎉 DEDUPLICATION PURGE COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Clean Unique Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ LIVE CATEGORIES BREAKDOWN:");
  catSummary.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  fs.writeFileSync(
    path.join(__dirname, 'duplicate_models_audit.json'),
    JSON.stringify({
      totalBefore: products.length,
      uniqueCount: modelMap.size,
      duplicateCount: idsToDelete.length,
      duplicates: duplicatesList
    }, null, 2),
    'utf8'
  );

  await connection.end();
  process.exit(0);
}

auditAndPurgeDuplicateModels();
