const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importLedAndDispenserProducts() {
  console.log("==================================================");
  console.log("🚀 IMPORTING LED TVs & WATER DISPENSERS INTO MARIADB");
  console.log("==================================================");

  const folder = path.join(__dirname, 'all products files');
  const ledCsvPath = path.join(folder, 'ALL LEDs ALFA.csv');
  const dispCsvPath = path.join(folder, 'PEL WATER DISPENSER OCT 2024.csv');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  let insertedCount = 0;

  // 1. Import LED TVs
  if (fs.existsSync(ledCsvPath)) {
    const text = fs.readFileSync(ledCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());

    lines.slice(1).forEach(async (l) => {
      const parts = l.split(',').map(s => s.replace(/"/g, '').trim());
      const title = parts[0] || parts[6];
      if (title && title.length > 5 && !title.includes('PRODUCT UPLOADED') && !title.includes('TOTAL')) {
        let brand = 'TCL';
        if (title.toUpperCase().includes('HAIER')) brand = 'Haier';
        if (title.toUpperCase().includes('SAMSUNG')) brand = 'Samsung';
        if (title.toUpperCase().includes('ECOSTAR')) brand = 'EcoStar';

        const category = 'LED TVs';
        const price = 85000;
        const discountPrice = Math.round(price * 0.94);
        const description = `Official ${title} with manufacturer warranty. Available in Karachi.`;
        const stock = 10;

        const [existing] = await connection.query("SELECT id FROM products WHERE name = ?", [title]);
        if (existing.length === 0) {
          await connection.query(
            "INSERT INTO products (name, brand, category, price, discountPrice, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [title, brand, category, price, discountPrice, description, stock]
          );
          insertedCount++;
        }
      }
    });
  }

  // 2. Import Water Dispensers
  if (fs.existsSync(dispCsvPath)) {
    const text = fs.readFileSync(dispCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());

    for (const l of lines) {
      const parts = l.split(',').map(s => s.replace(/"/g, '').trim());
      const title = parts[1];
      const rateStr = (parts[3] || '').replace(/[^0-9]/g, '');

      if (title && title.toLowerCase().includes('dispenser')) {
        const brand = title.split(' ')[0] || 'PEL';
        const category = 'Water Dispensers';
        const price = rateStr ? parseInt(rateStr) : 41000;
        const discountPrice = Math.round(price * 0.94);
        const description = `Official ${title} with 1 year official warranty. Available in Karachi.`;
        const stock = 12;

        const [existing] = await connection.query("SELECT id FROM products WHERE name = ?", [title]);
        if (existing.length === 0) {
          await connection.query(
            "INSERT INTO products (name, brand, category, price, discountPrice, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [title, brand, category, price, discountPrice, description, stock]
          );
          insertedCount++;
        }
      }
    }
  }

  const [totalRes] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log("\n==================================================");
  console.log("🎉 IMPORT COMPLETE");
  console.log("==================================================");
  console.log(`✅ Total LED TVs & Water Dispensers Imported: ${insertedCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${totalRes[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

importLedAndDispenserProducts();
