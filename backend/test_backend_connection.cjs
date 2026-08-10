const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'earthy_elec'
    });

    const [rows] = await db.query('SELECT COUNT(*) as total FROM products');
    console.log(`✅ Successfully connected to earthy_elec DB! Total products: ${rows[0].total}`);
    await db.end();
  } catch (err) {
    console.error("❌ Database Connection Error:", err.message);
  }
}

testConnection();
