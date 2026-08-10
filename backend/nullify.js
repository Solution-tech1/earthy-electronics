const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('earthyelec.db');
db.run("UPDATE product_variants SET image = NULL WHERE product_id IN (759, 753)", (err) => {
  if (err) console.error("variant err:", err);
  else console.log("Variants updated.");
});
db.run("UPDATE products SET image = NULL WHERE id IN (759, 753)", (err) => {
  if (err) console.error("products err:", err);
  else console.log("Products updated.");
});
