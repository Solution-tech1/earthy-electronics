const mysql = require('mysql2/promise');

async function checkCurrentDbTotalCount() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [totalRes] = await connection.query("SELECT COUNT(*) as total FROM products");
  const [catRes] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");

  console.log("==================================================");
  console.log("📊 CURRENT LIVE MARIADB DATABASE STATUS");
  console.log("==================================================");
  console.log(`🛒 Total Active Live Products in DB: ${totalRes[0].total}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ CATEGORIES BREAKDOWN:");
  catRes.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

checkCurrentDbTotalCount();
