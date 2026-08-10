const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, name, image FROM products WHERE name LIKE '%floor%' OR name LIKE '%cabinet%' OR name LIKE '%standing%' LIMIT 10");
  console.log('Floor/Cabinet items:', JSON.stringify(rows, null, 2));
  
  const [rows2] = await c.query("SELECT id, name, image FROM products WHERE image LIKE '%skin%' OR image LIKE '%beauty%' OR image LIKE '%diagram%' OR image LIKE '%chart%'");
  console.log('Random images:', JSON.stringify(rows2, null, 2));
  
  // also check washing machines top vs front
  const [rows3] = await c.query("SELECT id, name, image FROM products WHERE name LIKE '%top load%' OR name LIKE '%front load%' LIMIT 5");
  console.log('Washers:', JSON.stringify(rows3, null, 2));

  await c.end();
}
run().catch(console.error);
