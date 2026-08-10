const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function purgeBadBannerAndOverwhitenedImages() {
  console.log("==================================================");
  console.log("🧹 PURGING BANNERS, MEDICAL POSTERS & OVER-WHITENED CUTOUTS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Get all active products with images
  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`📦 Auditing ${products.length} live products for banners, posters, and bad cutouts...`);

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const badProductIds = [];

  products.forEach(p => {
    const fname = path.basename(p.image);
    const lowerName = (p.name + ' ' + fname).toLowerCase();

    // Check 1: Known bad filenames / posters / banners
    if (lowerName.includes('ako-prebieha') || lowerName.includes('liecba') || lowerName.includes('more-creation') || lowerName.includes('possibilities') || lowerName.includes('banner') || lowerName.includes('logo')) {
      badProductIds.push({ id: p.id, name: p.name, reason: "Banner / Medical Poster / Infographic Image" });
      return;
    }

    // Check 2: File inspection for over-whitened cutouts
    if (p.image.startsWith('/images/products/')) {
      const absPath = path.join(publicProductsDir, fname);
      if (fs.existsSync(absPath)) {
        const stats = fs.statSync(absPath);
        // Over-whitened cutouts often lose byte density or are known bad filenames (dw-7500c, etc)
        if (lowerName.includes('dw-7500c') || lowerName.includes('hwm-100-826') || lowerName.includes('dwt-1471-flp')) {
          badProductIds.push({ id: p.id, name: p.name, reason: "Bad / Over-whitened / Banner Cutout" });
        }
      }
    }
  });

  if (badProductIds.length > 0) {
    console.log(`\n⚠️ Found ${badProductIds.length} Products with Bad Banners or Over-whitened Cutouts. Deleting from DB...`);
    for (const b of badProductIds) {
      await connection.query("DELETE FROM products WHERE id = ?", [b.id]);
      console.log(`   ❌ Deleted Product ID #${b.id} ("${b.name}") [Reason: ${b.reason}]`);
    }
  } else {
    console.log("   ✅ No bad banner or over-whitened images found.");
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log("\n==================================================");
  console.log("🎉 CLEANUP AUDIT COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Clean Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeBadBannerAndOverwhitenedImages();
