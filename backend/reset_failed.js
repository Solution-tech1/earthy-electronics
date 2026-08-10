const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  await c.query("UPDATE products SET image = NULL WHERE image = 'NO_IMAGE_FOUND'");
  await c.end();
  fs.writeFileSync('e:/earthyelectronics/backend/sourcing_progress.json', JSON.stringify({processedIds:[]}));
  console.log('Reset NO_IMAGE_FOUND and cleared progress.');
}
run().catch(console.error);
