const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'earthy_elec'});
  
  // Live Products
  const [liveRows] = await con.query("SELECT id, brand, name FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' AND image NOT LIKE '/images/product_%' ORDER BY id ASC");
  let liveCsv = 'Product_ID,Brand,Model_Name\n';
  liveRows.forEach(r => {
    liveCsv += `${r.id},"${r.brand}","${r.name.replace(/"/g, '""')}"\n`;
  });
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\Live_Products_Final.csv', liveCsv);
  
  // Hidden Products
  const [hiddenRows] = await con.query("SELECT id, brand, name FROM products WHERE image IS NULL OR image = 'NO_IMAGE_FOUND' OR image LIKE '/images/cat_%' OR image LIKE '/images/product_%' ORDER BY id ASC");
  let hiddenCsv = 'Product_ID,Brand,Model_Name\n';
  hiddenRows.forEach(r => {
    hiddenCsv += `${r.id},"${r.brand}","${r.name.replace(/"/g, '""')}"\n`;
  });
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\Hidden_Pending_Products.csv', hiddenCsv);
  
  console.log(`Live Products: ${liveRows.length}`);
  console.log(`Hidden Products: ${hiddenRows.length}`);
  
  await con.end();
}

run().catch(console.error);
