const mysql = require('mysql2/promise');

async function purgeAllDuplicatesDeepAudit() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🔍 RUNNING DEEP AUDIT FOR DUPLICATE IMAGES AND DUPLICATE PRODUCT NAMES IN MARIADB...");

  // 1. Audit Duplicate Images
  const [dupesImg] = await db.query(
    `SELECT image, count(*) as cnt 
     FROM products 
     WHERE image IS NOT NULL AND image != '' 
     GROUP BY image 
     HAVING cnt > 1`
  );

  let imgDeleted = 0;
  for (const d of dupesImg) {
    const [rows] = await db.query('SELECT id, name, brand, image FROM products WHERE image = ? ORDER BY id ASC', [d.image]);
    const toDelete = rows.slice(1);
    for (const r of toDelete) {
      console.log(`❌ Removing Duplicate Image Row ID #${r.id}: [${r.brand}] ${r.name} (${r.image})`);
      await db.query('DELETE FROM products WHERE id = ?', [r.id]);
      imgDeleted++;
    }
  }

  // 2. Audit Duplicate Names/Titles
  const [dupesName] = await db.query(
    `SELECT name, count(*) as cnt 
     FROM products 
     WHERE name IS NOT NULL AND name != '' 
     GROUP BY name 
     HAVING cnt > 1`
  );

  let nameDeleted = 0;
  for (const d of dupesName) {
    const [rows] = await db.query('SELECT id, name, brand, image FROM products WHERE name = ? ORDER BY id ASC', [d.name]);
    const toDelete = rows.slice(1);
    for (const r of toDelete) {
      console.log(`❌ Removing Duplicate Name Row ID #${r.id}: [${r.brand}] ${r.name}`);
      await db.query('DELETE FROM products WHERE id = ?', [r.id]);
      nameDeleted++;
    }
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("✅ DEEP PURGE COMPLETED!");
  console.log(`• Duplicate Image Rows Removed: ${imgDeleted}`);
  console.log(`• Duplicate Name Rows Removed: ${nameDeleted}`);
  console.log(`• Final Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Final Unique Images in MariaDB: ${res[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

purgeAllDuplicatesDeepAudit().catch(console.error);
