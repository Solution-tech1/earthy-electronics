const mysql = require('mysql2/promise');
async function run() {
  const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'earthy_elec'});
  
  const badIds = [1071,1083,1086,1089,1090,1091,1092,1099];
  await con.query('UPDATE products SET image = ? WHERE id IN (?)', ['NO_IMAGE_FOUND', badIds]);
  console.log('Removed bad IDs from last batch.');
  
  const [totalRows] = await con.query('SELECT COUNT(*) as total FROM products');
  const [missingRows] = await con.query("SELECT COUNT(*) as missing FROM products WHERE image IS NULL OR image = 'NO_IMAGE_FOUND' OR image LIKE '/images/cat_%' OR image LIKE '/images/product_%'");
  const [foundRows] = await con.query("SELECT COUNT(*) as found FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' AND image NOT LIKE '/images/product_%'");
  
  console.log('Total Products:', totalRows[0].total);
  console.log('Found (Valid Images):', foundRows[0].found);
  console.log('Missing/Placeholders:', missingRows[0].missing);
  
  await con.end();
}
run().catch(console.error);
