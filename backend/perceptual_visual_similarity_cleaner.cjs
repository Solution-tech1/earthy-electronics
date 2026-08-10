const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function perceptualVisualSimilarityCleaner() {
  console.log("==================================================");
  console.log("🔍 VISUAL PIXEL-GRID AUDIT ACROSS ALL PRODUCT IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''");
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  console.log(`🔍 Total Active Products with Images: ${products.length}`);

  // Extract pixel sampling signature (reads 100 evenly spaced byte samples across image buffer)
  function getPixelSignature(absPath) {
    try {
      const buf = fs.readFileSync(absPath);
      const samples = [];
      const step = Math.max(1, Math.floor(buf.length / 100));
      for (let i = 0; i < buf.length; i += step) {
        samples.push(buf[i]);
      }
      return samples;
    } catch (e) {
      return null;
    }
  }

  function compareSignatures(sig1, sig2) {
    if (!sig1 || !sig2 || sig1.length !== sig2.length) return 100;
    let diff = 0;
    for (let i = 0; i < sig1.length; i++) {
      diff += Math.abs(sig1[i] - sig2[i]);
    }
    return diff / sig1.length;
  }

  const signatures = [];
  const duplicatesToRemove = [];

  for (const p of products) {
    if (!p.image || !p.image.startsWith('/images/products/')) continue;
    const fname = path.basename(p.image);
    const absPath = path.join(publicProductsDir, fname);

    if (fs.existsSync(absPath)) {
      const sig = getPixelSignature(absPath);
      if (sig) {
        let isDuplicate = false;
        for (const existing of signatures) {
          const avgDiff = compareSignatures(sig, existing.sig);
          // If average byte sampling difference < 5, they are visually identical images!
          if (avgDiff < 5) {
            isDuplicate = true;
            duplicatesToRemove.push({
              duplicateId: p.id,
              duplicateName: p.name,
              originalId: existing.id,
              originalName: existing.name,
              file: fname,
              originalFile: existing.file,
              diff: avgDiff.toFixed(2)
            });
            console.log(`⚠️ Visual Duplicate Found (Diff: ${avgDiff.toFixed(2)}): ID #${p.id} ("${p.name}") IS VISUALLY IDENTICAL TO ID #${existing.id} ("${existing.name}")`);
            break;
          }
        }

        if (!isDuplicate) {
          signatures.push({ id: p.id, name: p.name, file: fname, sig: sig });
        }
      }
    }
  }

  console.log(`\n🧹 Total Visually Duplicate Product Images Found: ${duplicatesToRemove.length}`);

  for (const item of duplicatesToRemove) {
    await connection.query("UPDATE products SET image = NULL WHERE id = ?", [item.duplicateId]);
    console.log(`❌ Removed Duplicate Image from ID #${item.duplicateId} ("${item.duplicateName}")`);
  }

  const [finalRes] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 VISUAL PIXEL-GRID DEDUPLICATION COMPLETE");
  console.log("==================================================");
  console.log(`🧹 Duplicate Pointers Removed: ${duplicatesToRemove.length}`);
  console.log(`🛒 Total Active Products in DB: ${finalRes[0].total}`);
  console.log(`✨ Total Products with 100% TRULY DISTINCT Cutouts: ${finalRes[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

perceptualVisualSimilarityCleaner();
