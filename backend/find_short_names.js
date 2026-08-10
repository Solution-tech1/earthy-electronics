const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query('SELECT id, name, category, brand FROM products');
  
  const shortNames = rows.filter(p => {
    const nameLow = (p.name || '').toLowerCase();
    const words = nameLow.replace(/[^\w\s]/gi, '').split(/\s+/);
    const hasNumbers = /\d/.test(nameLow);
    return words.length <= 2 && !hasNumbers;
  });
  
  console.log('Short names found:', shortNames.length);
  console.log(JSON.stringify(shortNames.slice(0, 20), null, 2));
  await c.end();
}
run().catch(console.error);
