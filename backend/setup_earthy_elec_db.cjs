const mysql = require('mysql2/promise');

async function setupEarthyDb() {
  console.log("==================================================");
  console.log("🛠️ SETTING UP MARIADB DATABASE 'earthy_elec'");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  await db.query("CREATE DATABASE IF NOT EXISTS earthy_elec");
  await db.query("USE earthy_elec");

  const [tables] = await db.query("SHOW TABLES LIKE 'products'");
  if (tables.length === 0) {
    console.log("Copying products table from bismillah_elec...");
    await db.query("CREATE TABLE products LIKE bismillah_elec.products");
    await db.query("INSERT INTO products SELECT * FROM bismillah_elec.products");
  }

  const [tot] = await db.query("SELECT COUNT(*) as total FROM products");
  console.log(`✅ DATABASE READY! Total Products in earthy_elec: ${tot[0].total}`);

  await db.end();
  process.exit(0);
}

setupEarthyDb().catch(console.error);
