const mysql = require('mysql2/promise');

async function restoreOriginalProducts() {
  console.log("==================================================");
  console.log("🔄 RESTORING EXACT ORIGINAL LIVE PRODUCTS (239 ITEMS)");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  // Check if bismillah_elec database exists to copy original products
  const [dbList] = await db.query("SHOW DATABASES LIKE 'bismillah_elec'");

  if (dbList.length > 0) {
    console.log("Copying original products from bismillah_elec database...");
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("TRUNCATE TABLE products");
    await db.query("INSERT INTO products SELECT * FROM bismillah_elec.products");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
  } else {
    console.log("Filtering out new Haier PDF products to leave only original items...");
    await db.query("DELETE FROM products WHERE description LIKE '%Original genuine Haier%' OR description LIKE '%Model:%'");
  }

  const [tot] = await db.query("SELECT COUNT(*) as total FROM products");
  console.log(`\n✅ RESTORE COMPLETE! Total Original Products in earthy_elec: ${tot[0].total}`);

  await db.end();
  process.exit(0);
}

restoreOriginalProducts().catch(console.error);
