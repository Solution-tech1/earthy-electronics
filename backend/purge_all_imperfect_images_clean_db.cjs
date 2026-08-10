const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function purgeAllImperfectImagesCleanDb() {
  console.log("==================================================");
  console.log("🧹 PURGING ALL PRODUCTS WITH IMPERFECT / FADED / CORRUPTED IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`Auditing ${products.length} live products for perfect image quality...`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const deletedIds = [];

  for (const p of products) {
    let isBad = false;
    let reason = "";

    const rawImg = (p.image || '').split('?')[0];

    if (rawImg.startsWith('/images/products/')) {
      const fname = path.basename(rawImg);
      const absPath = path.join(publicDir, fname);

      if (!fs.existsSync(absPath)) {
        isBad = true;
        reason = "File does not exist on disk";
      } else {
        const stats = fs.statSync(absPath);
        // Any cutout file under 25KB or containing bad keywords is purged
        if (stats.size < 25000) {
          isBad = true;
          reason = `Low file size (${Math.round(stats.size/1024)}KB < 25KB cutoff - likely over-whitened/faded)`;
        } else {
          const lower = (p.name + ' ' + fname).toLowerCase();
          if (lower.includes('hwm') || lower.includes('dwt') || lower.includes('dw-') || lower.includes('hrf') || lower.includes('hmw') || lower.includes('pmo')) {
            // Check if name has problematic cutout history
            if (lower.includes('316s6') || lower.includes('6550') || lower.includes('7200') || lower.includes('826') || lower.includes('1217') || lower.includes('28100') || lower.includes('210') || lower.includes('295') || lower.includes('393')) {
              isBad = true;
              reason = "Flagged imperfect cutout file";
            }
          }
        }
      }
    }

    if (isBad) {
      deletedIds.push({ id: p.id, name: p.name, reason: reason });
    }
  }

  if (deletedIds.length > 0) {
    console.log(`\n⚠️ Found ${deletedIds.length} Products with Imperfect / Faded / Corrupted Cutout Files. Deleting...`);
    for (const item of deletedIds) {
      await connection.query("DELETE FROM products WHERE id = ?", [item.id]);
      console.log(`   ❌ Deleted Product ID #${item.id} ("${item.name}") [Reason: ${item.reason}]`);
    }
  } else {
    console.log("   ✅ All remaining product images passed strict quality inspection.");
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");
  const [catSummary] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");

  console.log("\n==================================================");
  console.log("🎉 STRICT QUALITY PURGE COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Flawless Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ LIVE CATEGORIES BREAKDOWN:");
  catSummary.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeAllImperfectImagesCleanDb();
