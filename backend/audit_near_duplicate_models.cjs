const fs = require('fs');
const mysql = require('mysql2/promise');

async function auditNearDuplicateModels() {
  console.log("==================================================");
  console.log("🔍 AUDITING NEAR-DUPLICATE MODEL VARIATIONS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category FROM products ORDER BY id ASC");

  const cleanMap = new Map();
  const nearDuplicates = [];
  const idsToDelete = [];

  products.forEach(p => {
    // Strip all non-alphanumeric characters to find near-duplicates (e.g. HWM 100-316 vs HWM-100-316)
    const strippedKey = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanMap.has(strippedKey)) {
      const original = cleanMap.get(strippedKey);
      idsToDelete.push(p.id);
      nearDuplicates.push({
        duplicateId: p.id,
        duplicateName: p.name,
        retainedId: original.id,
        retainedName: original.name,
        brand: p.brand,
        category: p.category
      });
    } else {
      cleanMap.set(strippedKey, p);
    }
  });

  console.log(`\n==================================================`);
  console.log(`📊 NEAR-DUPLICATE AUDIT REPORT`);
  console.log(`==================================================`);
  console.log(`🛒 Total Products Before Clean: ${products.length}`);
  console.log(`✨ Truly Distinct Unique Models: ${cleanMap.size}`);
  console.log(`❌ Near-Duplicate Model Rows Found: ${idsToDelete.length}`);
  console.log(`==================================================\n`);

  if (idsToDelete.length > 0) {
    for (const id of idsToDelete) {
      await connection.query("DELETE FROM products WHERE id = ?", [id]);
    }
    console.log(`🧹 Purged ${idsToDelete.length} near-duplicate rows from DB.`);
  }

  const [finalState] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log(`🛒 Final Clean DB Product Count: ${finalState[0].total}`);

  fs.writeFileSync(
    'e:/earthyelectronics/backend/near_duplicates_audit.json',
    JSON.stringify(nearDuplicates, null, 2),
    'utf8'
  );

  await connection.end();
  process.exit(0);
}

auditNearDuplicateModels();
