const mysql = require('mysql2/promise');

async function check346() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await db.query(
    `SELECT id, name, category, brand, image FROM products WHERE name LIKE '%346%' OR name LIKE '%refrigerator%' OR category = 'Refrigerators'`
  );

  console.log(`Found ${rows.length} Refrigerator products in DB:`);
  rows.forEach(r => {
    console.log(`ID ${r.id}: "${r.name}" -> image: "${r.image}"`);
  });

  await db.end();
}

check346().catch(console.error);
