const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('earthyelec.db');
db.get('SELECT COUNT(*) as total FROM products', (e, r) => {
  console.log('Total:', r.total);
  db.get("SELECT COUNT(*) as with_img FROM products WHERE image IS NOT NULL AND image != ''", (e2, r2) => {
    console.log('With Image:', r2.with_img);
    db.close();
  });
});
