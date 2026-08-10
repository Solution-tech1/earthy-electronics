const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT name, image FROM products WHERE name LIKE '%floor standing%' LIMIT 10");
  console.log(JSON.stringify(rows, null, 2));
  await c.end();
}
run().catch(console.error);
