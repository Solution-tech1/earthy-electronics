require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function countRemainingTodoProducts() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  // Get live DB product names in lowcase
  const [dbProducts] = await db.query('SELECT name FROM products');
  const dbNameSet = new Set(dbProducts.map(p => (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')));

  const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
  const todoRows = [];

  fs.createReadStream(todoCsvPath)
    .pipe(csv())
    .on('data', (row) => todoRows.push(row))
    .on('end', async () => {
      let remainingCount = 0;
      const categoryBreakdown = {};

      todoRows.forEach(row => {
        const rawName = (row.Model_Name || row.Name || '').replace(/[^\x00-\x7F]/g, ' ').trim();
        if (!rawName) return;

        const nameKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!dbNameSet.has(nameKey)) {
          remainingCount++;
          const cat = row.Category || 'Other';
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
        }
      });

      console.log(`\n==================================================`);
      console.log(`📊 REMAINING PRODUCTS TODO AUDIT REPORT`);
      console.log(`==================================================`);
      console.log(`• Total Rows in TODO File: ${todoRows.length}`);
      console.log(`• Total Live Products in MariaDB (With Unique Images): ${dbProducts.length}`);
      console.log(`• REMAINING Products Needing Images: ${remainingCount}`);
      console.log(`\n📂 Category Breakdown of Remaining Products:`);
      Object.entries(categoryBreakdown).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count} products`);
      });
      console.log(`==================================================\n`);

      process.exit(0);
    });
}

countRemainingTodoProducts().catch(console.error);
