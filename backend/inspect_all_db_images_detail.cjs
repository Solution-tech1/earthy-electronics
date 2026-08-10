const mysql = require('mysql2/promise');

async function inspectAllDbImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await connection.query("SELECT id, name, brand, category, image FROM products ORDER BY id ASC");
  console.log(`Total Products in DB: ${rows.length}`);
  rows.forEach(r => {
    console.log(`ID #${r.id} | [${r.brand}] ${r.name} | Cat: ${r.category} | Image: ${r.image}`);
  });

  await connection.end();
}

inspectAllDbImages();
