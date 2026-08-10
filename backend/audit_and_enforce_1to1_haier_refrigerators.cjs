const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function enforceUniqueHaierRefImages() {
  console.log("==================================================");
  console.log("🔍 AUDITING & ENFORCING STRICT 1-TO-1 UNIQUE IMAGES FOR HAIER REFRIGERATORS");
  console.log("🔒 RULE: ZERO DUPLICATE IMAGE SHARING; SHARED VARIANTS RESET TO ''");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Query all Haier Refrigerators
  const [rows] = await db.query(
    `SELECT id, name, image FROM products WHERE brand = 'Haier' AND category = 'Refrigerators'`
  );

  console.log(`Total Haier Refrigerators in DB: ${rows.length}\n`);

  // Count image occurrences
  const imageCounts = {};
  rows.forEach(r => {
    const img = (r.image || '').trim();
    if (img !== '') {
      imageCounts[img] = (imageCounts[img] || 0) + 1;
    }
  });

  console.log("Image Usage Counts among Haier Refrigerators:");
  Object.keys(imageCounts).forEach(img => {
    console.log(`   - "${img}": used by ${imageCounts[img]} models`);
  });

  const seenImages = new Set();
  let keptCount = 0;
  let clearedCount = 0;

  for (const r of rows) {
    const img = (r.image || '').trim();

    if (!img) continue;

    if (imageCounts[img] > 1) {
      if (!seenImages.has(img)) {
        // Keep image ONLY for the primary/first model
        seenImages.add(img);
        keptCount++;
        console.log(`✅ [ID ${r.id}] ${r.name} -> KEPT PRIMARY UNIQUE IMAGE ("${img}")`);
      } else {
        // Reset secondary duplicate variants to ""
        await db.execute('UPDATE products SET image = "" WHERE id = ?', [r.id]);
        clearedCount++;
        console.log(`❌ [ID ${r.id}] ${r.name} -> CLEARED SHARED DUPLICATE IMAGE TO ''`);
      }
    } else {
      keptCount++;
      seenImages.add(img);
      console.log(`✅ [ID ${r.id}] ${r.name} -> UNIQUE IMAGE ("${img}")`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 STRICT 1-TO-1 ENFORCEMENT SUMMARY");
  console.log("==================================================");
  console.log(`✅ Haier Refrigerators with Unique 1-to-1 Image: ${keptCount}`);
  console.log(`❌ Shared Duplicate Variants Reset to '': ${clearedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

enforceUniqueHaierRefImages().catch(console.error);
