const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query('SELECT * FROM products');
  
  let csv = 'id,name,category,brand,price,image\n';
  rows.forEach(r => {
    csv += `${r.id},"${r.name}","${r.category}","${r.brand}",${r.price},"${r.image}"\n`;
  });
  
  fs.writeFileSync('e:/earthyelectronics/backend/products_backup_pre_bulk.csv', csv);
  console.log('Backup saved.');
  await c.end();
}
run().catch(console.error);
