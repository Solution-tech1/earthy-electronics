const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, name, category, brand, image FROM products WHERE name LIKE '%floor standing%' OR name LIKE '%front load%' LIMIT 5");
  console.log(JSON.stringify(rows, null, 2));
  await c.end();
}
run().catch(console.error);
