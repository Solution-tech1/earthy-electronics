const mysql = require('mysql2/promise');

async function purgeGenericMissingModelsFromDB() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🔍 AUDITING MARIADB PRODUCTS FOR MISSING/GENERIC MODEL TITLES...");

  const [products] = await db.query('SELECT id, name, brand, category FROM products');
  let deletedCount = 0;

  for (const p of products) {
    const nameTrim = (p.name || '').trim().toUpperCase();
    const words = nameTrim.split(/\s+/);
    
    // Check if name is purely generic (no digits and no hyphenated model code)
    const hasDigits = /\d/.test(nameTrim);
    const hasModelCode = /-[A-Z0-9]/i.test(nameTrim);
    const isGenericWord = ['HAIER', 'PEL', 'GREE', 'DAWLANCE', 'TCL', 'KENWOOD', 'ECOSTAR', 'ORIENT', 'WESTPOINT', 'SAMSUNG', 'HOMAGE', 'ROYAL', 'SUPER ASIA', 'WASHER', 'SPIN DRYER', 'WASH & SPIN', 'AC', 'AIR CONDITIONER', 'MICROWAVE', 'WATER DISPENSER'].includes(nameTrim);

    if ((!hasDigits && !hasModelCode) || isGenericWord || nameTrim.length <= 3) {
      console.log(`❌ Deleting Generic Row ID #${p.id}: [${p.brand}] ${p.name}`);
      await db.query('DELETE FROM products WHERE id = ?', [p.id]);
      deletedCount++;
    }
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("✅ GENERIC/MISSING MODEL PURGE COMPLETED!");
  console.log(`• Generic Rows Removed: ${deletedCount}`);
  console.log(`• Final Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Final Unique Images in MariaDB: ${res[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

purgeGenericMissingModelsFromDB().catch(console.error);
