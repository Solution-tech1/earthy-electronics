const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [res] = await c.query('UPDATE products SET image = NULL WHERE image = "NO_IMAGE_FOUND"');
  console.log(`Reset ${res.affectedRows} items to NULL`);
  await c.end();
}
run();
