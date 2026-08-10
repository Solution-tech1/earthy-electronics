const mysql = require('mysql2/promise');
const fs = require('fs');

async function restoreClean239() {
  console.log("==================================================");
  console.log("🧹 RESTORING DATABASE TO CLEAN ORIGINAL 239 VERIFIED PRODUCTS ONLY");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Delete all products that have empty brand or were added in yesterday's bulk import
  const [res] = await db.query("DELETE FROM products WHERE brand IS NULL OR brand = '' OR brand = 'Local'");
  console.log(`Deleted ${res.affectedRows} extra/unverified product rows.`);

  const [after] = await db.query('SELECT COUNT(*) as count FROM products');
  console.log(`\nRemaining Clean Verified Products in DB: ${after[0].count}`);

  const [brandBreakdown] = await db.query('SELECT brand, COUNT(*) as cnt FROM products GROUP BY brand');
  console.log("\nVerified Products by Brand:");
  brandBreakdown.forEach(b => console.log(`   ${b.brand}: ${b.cnt}`));

  await db.end();
  console.log("==================================================");
}

restoreClean239().catch(console.error);
