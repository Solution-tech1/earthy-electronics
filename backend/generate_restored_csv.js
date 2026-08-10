const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  // Fetch products that have a valid http/https image URL
  const [rows] = await c.query("SELECT id, brand, name, image FROM products WHERE image LIKE 'http%'");
  
  let csv = 'Product_ID,Brand,Model_Name,Image_URL\n';
  rows.forEach(r => {
    csv += `${r.id},"${r.brand}","${r.name}","${r.image}"\n`;
  });
  
  fs.writeFileSync('Restored_Products_Verification.csv', csv);
  console.log('Wrote ' + rows.length + ' products to Restored_Products_Verification.csv');
  await c.end();
}
run().catch(console.error);
