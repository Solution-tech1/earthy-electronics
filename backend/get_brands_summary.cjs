const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

async function getBrandsSummary() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  // 1. Live Brands in MariaDB
  const [liveBrandsRows] = await db.query(
    'SELECT brand, COUNT(*) as count FROM products GROUP BY brand ORDER BY count DESC'
  );

  // 2. Total Catalog Brands from TODO CSV
  const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
  const todoBrandsMap = {};
  
  if (fs.existsSync(todoCsvPath)) {
    await new Promise((resolve) => {
      fs.createReadStream(todoCsvPath)
        .pipe(csv())
        .on('data', (d) => {
          const b = (d.Brand || 'Other').trim();
          todoBrandsMap[b] = (todoBrandsMap[b] || 0) + 1;
        })
        .on('end', resolve);
    });
  }

  // 3. Ready CSV Brands
  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  const readyBrandsMap = {};
  if (fs.existsSync(readyCsvPath)) {
    await new Promise((resolve) => {
      fs.createReadStream(readyCsvPath)
        .pipe(csv())
        .on('data', (d) => {
          const b = (d.Brand || d.brand || 'Other').trim();
          readyBrandsMap[b] = (readyBrandsMap[b] || 0) + 1;
        })
        .on('end', resolve);
    });
  }

  console.log("=== LIVE WEBSITE BRANDS (MARIADB) ===");
  liveBrandsRows.forEach(r => console.log(`• ${r.brand}: ${r.count} products`));

  console.log("\n=== TOTAL CATALOG BRANDS (TODO FILE) ===");
  Object.entries(todoBrandsMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([b, cnt]) => console.log(`• ${b}: ${cnt} products`));

  process.exit(0);
}

getBrandsSummary().catch(console.error);
