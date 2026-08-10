const mysql = require('mysql2/promise');
const fs = require('fs');

async function backup() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'earthy_elec' });
  const [rows] = await c.query('SELECT * FROM products');
  fs.writeFileSync('earthy_elec_products_backup_m5.json', JSON.stringify(rows, null, 2));
  console.log(`Backup completed: ${rows.length} rows saved.`);
  await c.end();
}
backup();
