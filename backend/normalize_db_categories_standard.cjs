const mysql = require('mysql2/promise');

async function normalizeDbCategoriesStandard() {
  console.log("==================================================");
  console.log("🏷️ NORMALIZING ALL DATABASE CATEGORY NAMES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  await connection.query("UPDATE products SET category = 'Washing Machines' WHERE category = 'Washing Machine'");
  await connection.query("UPDATE products SET category = 'Microwave Ovens' WHERE category = 'Microwave'");
  await connection.query("UPDATE products SET category = 'Kitchen Appliances' WHERE category = 'Kitchen Appliance'");

  const [catRows] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");
  console.log("\nNormalized Category Counts in DB:");
  catRows.forEach(c => console.log(`   - ${c.category}: ${c.cnt}`));

  const [totalRes] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log(`\n🛒 Total Active Products in DB: ${totalRes[0].total}`);

  await connection.end();
  process.exit(0);
}

normalizeDbCategoriesStandard();
