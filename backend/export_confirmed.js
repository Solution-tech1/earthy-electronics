const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' AND image NOT IN ('/images/product_ac.png', '/images/product_fridge.png', '/images/product_dispenser.png', '/images/product_freezer.png', '/images/product_geyser.svg', '/images/cat_kitchen.png', '/images/cat_microwave.png', '/images/cat_tv.png', '/images/cat_washer.png')");
  
  let csv = 'Product_ID,Brand,Model_Name,Category,Image_URL\n';
  rows.forEach(r => {
    csv += `${r.id},"${r.brand}","${r.name}","${r.category}","${r.image}"\n`;
  });
  
  fs.writeFileSync('confirmed_products_list.csv', csv);
  console.log('Wrote', rows.length, 'products to confirmed_products_list.csv');
  await c.end();
}
run();
