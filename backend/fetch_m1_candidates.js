const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, name, category, image FROM products WHERE (name LIKE '%floor standing%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') LIMIT 20");
  console.log(JSON.stringify(rows, null, 2));
  await c.end();
}
run().catch(console.error);
