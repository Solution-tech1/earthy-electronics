const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  await c.query("UPDATE products SET brand = 'Dawlance' WHERE name LIKE '%DW-11467 es%' OR name LIKE '%DWT 9560%'");
  console.log('Fixed brands for Dawlance products.');
  await c.end();
}
run().catch(console.error);
