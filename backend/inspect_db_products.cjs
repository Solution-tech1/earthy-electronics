const mysql = require('mysql2/promise');

async function inspectDb() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await db.query('SELECT COUNT(*) as count FROM products');
  console.log(`Total Products in DB: ${rows[0].count}`);

  const [brands] = await db.query('SELECT brand, COUNT(*) as cnt FROM products GROUP BY brand');
  console.log("Products by Brand:");
  brands.forEach(b => console.log(`   ${b.brand}: ${b.cnt}`));

  await db.end();
}

inspectDb().catch(console.error);
