const mysql = require('mysql2/promise');

async function checkDb() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await db.query('SELECT COUNT(*) as total FROM products');
  const [withImg] = await db.query('SELECT COUNT(*) as total FROM products WHERE image != ""');

  console.log("==================================================");
  console.log(`TOTAL PRODUCTS IN DB: ${rows[0].total}`);
  console.log(`PRODUCTS WITH ACTIVE IMAGES: ${withImg[0].total}`);
  console.log(`PRODUCTS IN NO_IMAGE STATE (""): ${rows[0].total - withImg[0].total}`);
  console.log("==================================================");

  await db.end();
}

checkDb().catch(console.error);
