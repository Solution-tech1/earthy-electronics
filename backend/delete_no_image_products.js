const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('earthyelec.db');
db.run("DELETE FROM products WHERE image IS NULL OR image = ''", function(err) {
  if (err) {
    console.error(err);
  } else {
    console.log(`Deleted ${this.changes} products without images.`);
    db.get('SELECT COUNT(*) as total FROM products', (e, r) => {
      console.log('Total remaining:', r.total);
      db.close();
    });
  }
});
