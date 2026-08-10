const mysql = require('mysql2/promise');

async function inspectDbCategories() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await db.query('SELECT DISTINCT category FROM products');
  console.log("Distinct Categories in DB:");
  rows.forEach(r => console.log(`   - "${r.category}"`));

  await db.end();
}

inspectDbCategories().catch(console.error);
