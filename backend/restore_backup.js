const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'earthyelec.db');
const backupPath = path.join(__dirname, 'earthy_elec_products_backup_m5.json');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    process.exit(1);
  }
});

const restore = async () => {
  try {
    const rawData = fs.readFileSync(backupPath);
    const products = JSON.parse(rawData);

    console.log(`Found ${products.length} products in backup.`);

    // Clear existing products
    db.serialize(() => {
      db.run('DELETE FROM products', (err) => {
        if (err) console.error('Error clearing products:', err);
        else console.log('Existing products cleared.');
      });

      const stmt = db.prepare(`INSERT INTO products (id, name, brand, category, price, discountPrice, image, description, specifications, stock, stock_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      products.forEach(p => {
        stmt.run([p.id, p.name, p.brand, p.category, p.price, p.discountPrice, p.image, p.description, p.specifications ? JSON.stringify(p.specifications) : '{}', p.stock || 10, p.stock_threshold || 5, p.created_at]);
      });

      stmt.finalize(() => {
        console.log(`Restored all products successfully.`);
        db.close();
      });
    });
  } catch (err) {
    console.error('Failed to restore:', err);
  }
};

restore();
