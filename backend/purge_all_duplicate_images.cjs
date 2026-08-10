const mysql = require('mysql2/promise');

async function purgeAllDuplicateImages() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🔍 AUDITING MARIADB PRODUCTS TABLE FOR DUPLICATE IMAGES...");

  const [dupes] = await db.query(
    `SELECT image, count(*) as cnt 
     FROM products 
     WHERE image IS NOT NULL AND image != '' 
     GROUP BY image 
     HAVING cnt > 1`
  );

  console.log(`Found ${dupes.length} image URLs sharing duplicates!`);

  let totalDeleted = 0;

  for (const d of dupes) {
    const [rows] = await db.query('SELECT id, name, brand, image FROM products WHERE image = ? ORDER BY id ASC', [d.image]);
    
    // Keep the first row, delete all subsequent duplicate rows!
    const toDelete = rows.slice(1);
    for (const r of toDelete) {
      console.log(`❌ Deleting Duplicate Row ID #${r.id}: [${r.brand}] ${r.name}`);
      await db.query('DELETE FROM products WHERE id = ?', [r.id]);
      totalDeleted++;
    }
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_images FROM products');
  
  console.log("\n==================================================");
  console.log("✅ DUPLICATE PURGE COMPLETED!");
  console.log(`• Total Duplicate Rows Removed: ${totalDeleted}`);
  console.log(`• Final Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Final Unique Images in MariaDB: ${res[0].unique_images}`);
  console.log("==================================================\n");

  process.exit(0);
}

purgeAllDuplicateImages().catch(console.error);
