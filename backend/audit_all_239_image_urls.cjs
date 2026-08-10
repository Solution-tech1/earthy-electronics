const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function auditAllImages() {
  console.log("==================================================");
  console.log("🔬 AUDITING ALL 239 PRODUCT IMAGE PATHS IN DETAIL");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const [products] = await db.query('SELECT id, name, category, image FROM products');

  console.log(`Total products checked: ${products.length}\n`);

  let invalidCount = 0;
  products.forEach((p, i) => {
    const rawImg = p.image || '';
    const cleanPath = rawImg.replace(/^\//, '');
    const fullPath = path.join(publicDir, cleanPath);
    const exists = fs.existsSync(fullPath);

    if (!rawImg || rawImg.trim() === '' || !exists) {
      invalidCount++;
      console.log(`❌ INVALID [#${i+1}]: ID #${p.id} | ${p.name} | Image: "${rawImg}" | File Exists: ${exists}`);
    }
  });

  if (invalidCount === 0) {
    console.log("✅ All 239 products have valid image paths pointing to existing files on disk!");
  } else {
    console.log(`⚠️ Found ${invalidCount} products with invalid/missing image files.`);
  }

  await db.end();
  process.exit(0);
}

auditAllImages().catch(console.error);
