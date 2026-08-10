const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function purgeAllBlackBgAndCorruptedCutouts() {
  console.log("==================================================");
  console.log("🧹 PURGING ALL BLACK BACKGROUND & CORRUPTED CUTOUT IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`📦 Auditing ${products.length} live product images...`);

  const badProductIds = [];

  products.forEach(p => {
    const lower = (p.name + ' ' + (p.image || '')).toLowerCase();

    // Check 1: Mobile phone banner on washing machine or black background AC
    if (lower.includes('wa80ck') || lower.includes('tac-24hea') || lower.includes('tcl elite')) {
      badProductIds.push({ id: p.id, name: p.name, reason: "Mobile phone banner or pitch black background image" });
      return;
    }

    // Check 2: Erased / over-whitened washing machines shown in user screenshots
    if (lower.includes('dw-14470') || lower.includes('dw-6000') || lower.includes('dw-6550') || lower.includes('wa21ck6745') || lower.includes('wa90ck4545')) {
      badProductIds.push({ id: p.id, name: p.name, reason: "Erased / over-whitened body panel cutout" });
      return;
    }

    // Check 3: Distorted brush stroke refrigerators
    if (lower.includes('hrf-246') || lower.includes('hrf-316') || lower.includes('hrf-216')) {
      badProductIds.push({ id: p.id, name: p.name, reason: "Distorted wave / brush stroke refrigerator cutout" });
      return;
    }
  });

  if (badProductIds.length > 0) {
    console.log(`\n⚠️ Found ${badProductIds.length} Products with Bad / Corrupted Cutouts. Deleting from DB...`);
    for (const b of badProductIds) {
      await connection.query("DELETE FROM products WHERE id = ?", [b.id]);
      console.log(`   ❌ Deleted Product ID #${b.id} ("${b.name}") [Reason: ${b.reason}]`);
    }
  } else {
    console.log("   ✅ No bad images found.");
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");
  console.log("\n==================================================");
  console.log("🎉 BLACK BG & CORRUPTED CUTOUTS AUDIT COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Clean Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

purgeAllBlackBgAndCorruptedCutouts();
