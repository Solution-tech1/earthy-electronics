const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function checkDiskImages() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [rows] = await db.query('SELECT id, name, category, brand, image FROM products');
  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  console.log("==================================================");
  console.log("🔍 CHECKING DISK IMAGES FOR ALL 239 DB PRODUCTS");
  console.log("==================================================");

  let missingOnDisk = 0;
  let zeroByteCount = 0;

  for (const r of rows) {
    if (!r.image || r.image.includes('placeholder')) continue;

    const diskPath = path.join(publicDir, r.image);
    if (!fs.existsSync(diskPath)) {
      missingOnDisk++;
      console.log(`❌ FILE MISSING ON DISK [ID: ${r.id}] ${r.name} -> Path: ${diskPath}`);
    } else {
      const stats = fs.statSync(diskPath);
      if (stats.size < 500) {
        zeroByteCount++;
        console.log(`⚠️ INVALID/BROKEN FILE SIZE [ID: ${r.id}] ${r.name} -> Size: ${stats.size} bytes`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`Total Missing Files On Disk: ${missingOnDisk}`);
  console.log(`Total Invalid/Tiny Files On Disk: ${zeroByteCount}`);
  console.log("==================================================\n");

  await db.end();
}

checkDiskImages().catch(console.error);
