const mysql = require('mysql2/promise');

async function auditAndFixEcostarDuplicates() {
  console.log("==================================================");
  console.log("🔍 AUDITING ECOSTAR PRODUCTS FOR DUPLICATE IMAGES...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [rows] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE LOWER(brand) LIKE '%ecostar%' OR LOWER(name) LIKE '%ecostar%'`
  );

  console.log(`Found ${rows.length} EcoStar products in MariaDB:`);

  const imageMap = {};
  const duplicateIds = [];

  rows.forEach(r => {
    console.log(` [#${r.id}] ${r.name} -> ${r.image}`);
    if (imageMap[r.image]) {
      duplicateIds.push(r.id);
      console.log(` ❌ DUPLICATE IMAGE FOUND on ID #${r.id}: ${r.name}`);
    } else {
      imageMap[r.image] = r.id;
    }
  });

  if (duplicateIds.length > 0) {
    console.log(`\nDeleting ${duplicateIds.length} duplicate EcoStar rows to keep site 100% clean & unique...`);
    await db.query(`DELETE FROM products WHERE id IN (?)`, [duplicateIds]);
  } else {
    console.log("\nZero duplicate images found among EcoStar products!");
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("✅ ECOSTAR DUPLICATE PURGE COMPLETE!");
  console.log(`• Duplicates Purged: ${duplicateIds.length}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

auditAndFixEcostarDuplicates().catch(console.error);
