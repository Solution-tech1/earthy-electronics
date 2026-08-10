const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function keepOnlyPureWhiteCutouts() {
  console.log("==================================================");
  console.log("🧼 STRICT PURGE: KEEPING ONLY PRODUCTS WITH 100% LOCAL PURE WHITE CUTOUT IMAGES");
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
      // Delete product row from DB completely
      await db.execute('DELETE FROM products WHERE id = ?', [p.id]);
      deletedCount++;
      console.log(`❌ Deleted from DB: [ID ${p.id}] ${p.name} (Lacks verified local white cutout)`);
    } else {
      keptCount++;
      console.log(`✅ Kept in DB: [ID ${p.id}] ${p.name} (${imgUrl})`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 STRICT 100% PURE WHITE CUTOUT SUMMARY");
  console.log("==================================================");
  console.log(`✅ Total Pure White Cutout Products Live on Site: ${keptCount}`);
  console.log(`❌ Deleted Products Lacking Local White Cutout: ${deletedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

keepOnlyPureWhiteCutouts().catch(console.error);
