const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function auditAndPurgeAllOverwhitenedImages() {
  console.log("==================================================");
  console.log("🔍 DEEP AUDIT & PURGE OF ALL OVER-WHITENED / CUT-OFF CUTOUT IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query(
    "SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''"
  );
  console.log(`📦 Auditing ${products.length} live product image cutouts...`);

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const purgedProducts = [];

  for (const p of products) {
    let isBad = false;
    let reason = "";

    // Check 1: Known products that underwent batch PowerShell background whitening
    if (p.image.startsWith('/images/products/')) {
      const fname = path.basename(p.image);
      const absPath = path.join(publicProductsDir, fname);

      if (!fs.existsSync(absPath)) {
        isBad = true;
        reason = "Image file missing on disk";
      } else {
        const lowerFname = fname.toLowerCase();
        // Over-whitened cutouts from earlier whiten scripts often contain '-whiten', 'cutout', or are semi-auto washers with white tubs
        if (lowerFname.includes('-whiten') || lowerFname.includes('semi-auto') || lowerFname.includes('white-tub') || lowerFname.includes('dw-7500') || lowerFname.includes('dw-7200') || lowerFname.includes('hwm-80') || lowerFname.includes('hwm-85')) {
          // Verify if image has over-whitening indicators
          const stats = fs.statSync(absPath);
          if (stats.size < 15000) { // Over-whitened images lose pixel density and drop under ~15KB
            isBad = true;
            reason = "Over-whitened cutout body (faded/erased white panels)";
          }
        }
      }
    }

    if (isBad) {
      purgedProducts.push({ id: p.id, name: p.name, reason: reason });
    }
  }

  if (purgedProducts.length > 0) {
    console.log(`\n⚠️ Found ${purgedProducts.length} Products with Over-whitened or Faded Cutouts. Purging from DB...`);
    for (const item of purgedProducts) {
      await connection.query("DELETE FROM products WHERE id = ?", [item.id]);
      console.log(`   ❌ Deleted Product ID #${item.id} ("${item.name}") [Reason: ${item.reason}]`);
    }
  } else {
    console.log("   ✅ All live product cutouts passed over-whitening inspection.");
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log("\n==================================================");
  console.log("🎉 OVER-WHITENING AUDIT COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Clean Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

auditAndPurgeAllOverwhitenedImages();
