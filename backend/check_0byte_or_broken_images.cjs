const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function checkImageFileSizes() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const [products] = await db.query('SELECT id, name, category, image FROM products');

  const zeroOrSmallFiles = [];

  for (const p of products) {
    const relPath = (p.image || '').replace(/^\//, '');
    const absPath = path.join(publicDir, relPath);

    if (fs.existsSync(absPath)) {
      const stats = fs.statSync(absPath);
      if (stats.size < 500) { // Less than 500 bytes is suspicious / broken
        zeroOrSmallFiles.push({ p, size: stats.size });
      }
    } else {
      zeroOrSmallFiles.push({ p, size: 0 });
    }
  }

  console.log(`==================================================`);
  console.log(`🔍 0-BYTE / SUSPICIOUS FILE AUDIT RESULTS:`);
  console.log(`==================================================`);
  console.log(`Found ${zeroOrSmallFiles.length} suspicious or broken image files:`);

  zeroOrSmallFiles.forEach((item, i) => {
    console.log(`   [${i+1}] ID #${item.p.id} | ${item.p.name} | Path: "${item.p.image}" | Size: ${item.size} bytes`);
  });

  await db.end();
  process.exit(0);
}

checkImageFileSizes().catch(console.error);
