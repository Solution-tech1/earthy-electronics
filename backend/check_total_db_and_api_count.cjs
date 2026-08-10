const mysql = require('mysql2/promise');

async function checkTotalDbAndApiCount() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await connection.query("SELECT COUNT(*) as cnt FROM products");
  console.log("Total DB Row Count:", rows[0].cnt);

  const [catRows] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");
  console.log("\nCategory Counts in DB:");
  catRows.forEach(c => console.log(`   - ${c.category || 'NULL'}: ${c.cnt}`));

  await connection.end();
}

checkTotalDbAndApiCount();
