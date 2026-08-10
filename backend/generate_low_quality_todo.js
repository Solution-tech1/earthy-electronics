const mysql = require('mysql2/promise');
const fs = require('fs');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, brand, name, image FROM products WHERE image LIKE '%encrypted-tbn0.gstatic.com%'");
  let csv = 'Product_ID,Brand,Model_Name,Image_URL\n';
  rows.forEach(r => {
    csv += `${r.id},"${r.brand}","${r.name}","${r.image}"\n`;
  });
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\Low_Quality_Thumbnails_TODO.csv', csv);
  console.log('Wrote ' + rows.length + ' products to Low_Quality_Thumbnails_TODO.csv');
  await c.end();
}
run().catch(console.error);
