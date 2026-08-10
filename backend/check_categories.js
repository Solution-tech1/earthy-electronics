const mysql = require('mysql2/promise');

async function checkCategories() {
  const con = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'earthy_elec'});
  
  const [liveRows] = await con.query("SELECT category, COUNT(*) as count FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' GROUP BY category");
  console.log('--- LIVE CATEGORIES ---');
  console.table(liveRows);

  const [hiddenRows] = await con.query("SELECT category, COUNT(*) as count FROM products WHERE image IS NULL OR image = 'NO_IMAGE_FOUND' OR image LIKE '/images/cat_%' GROUP BY category");
  console.log('\n--- HIDDEN CATEGORIES ---');
  console.table(hiddenRows);

  await con.end();
}

checkCategories().catch(console.error);
