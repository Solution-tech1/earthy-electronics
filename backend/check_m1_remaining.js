const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [productsToFix] = await c.query(
    "SELECT id, name, category, brand, image FROM products " +
    "WHERE (name LIKE '%floor standing%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') " +
    "AND (image IS NULL OR image LIKE '/images/cat_%' OR image LIKE '%product_fridge%' OR image LIKE '%product_washer%')"
  );
  console.log('Remaining M1 items:', productsToFix.length);
  await c.end();
}
run().catch(console.error);
