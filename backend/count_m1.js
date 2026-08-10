const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  
  const [m1_rows] = await c.query("SELECT id, name, category, image FROM products WHERE (name LIKE '%floor%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') AND image IS NULL");
  
  console.log('M1 Count:', m1_rows.length);
  console.log('M1 Examples:', JSON.stringify(m1_rows.slice(0, 3), null, 2));
  
  await c.end();
}
run().catch(console.error);
