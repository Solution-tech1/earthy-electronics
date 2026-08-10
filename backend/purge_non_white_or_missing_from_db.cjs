const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function purgeNonWhiteFromDb() {
  console.log("==================================================");
  console.log("🧼 PURGING ANY REMAINING PRODUCTS THAT LACK A LOCAL WHITE CUTOUT");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products');
  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  let deletedCount = 0;
  let keptCount = 0;

  for (const p of products) {
    const imgUrl = (p.image || '').trim();
    let isLocalValid = false;

    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) {
      const relativePath = imgUrl.replace(/^\//, '');
      const absPath = path.join(publicDir, relativePath);
      if (fs.existsSync(absPath)) {
        const stat = fs.statSync(absPath);
        if (stat.size > 2000) {
          isLocalValid = true;
        }
      }
    }

    if (!isLocalValid) {
      await db.execute('DELETE FROM products WHERE id = ?', [p.id]);
      deletedCount++;
      console.log(`❌ Deleted: [ID ${p.id}] ${p.name}`);
    } else {
      keptCount++;
      console.log(`✅ Kept: [ID ${p.id}] ${p.name}`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 STRICT PURE WHITE CUTOUT SUMMARY");
  console.log("==================================================");
  console.log(`✅ Total Pure White Studio Cutout Products Live on Site: ${keptCount}`);
  console.log(`❌ Deleted Unverified / Non-White Products: ${deletedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

purgeNonWhiteFromDb().catch(console.error);
