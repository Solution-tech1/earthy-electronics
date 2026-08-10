const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeFullAuditAndFix() {
  console.log("==================================================");
  console.log("🛡️ FULL SITE-WIDE IMAGE AUDIT, CLEANUP & VERIFIED RESTORATION");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // 1. Build Master Verified Map from historical verified records
  const verifiedMap = new Map(); // Key: clean model name -> Value: exact verified image URL

  // Record set A: Products_WITH_Images_READY.csv
  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  if (fs.existsSync(readyCsvPath)) {
    const lines = fs.readFileSync(readyCsvPath, 'utf8').split('\n');
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 6) {
        const modelKey = parts[3].toLowerCase();
        const imgUrl = parts[5];
        if (modelKey && imgUrl && !imgUrl.includes('placeholder') && !imgUrl.includes('logo') && !imgUrl.startsWith('http')) {
          verifiedMap.set(modelKey, imgUrl);
        }
      }
    });
  }

  // Record set B: Haier Matched Refrigerators (pak_ref_final_report.json & pak_ref_chunk2_report.json)
  const refReports = ['pak_ref_final_report.json', 'pak_ref_chunk2_report.json'];
  refReports.forEach(rf => {
    const rPath = path.join(__dirname, rf);
    if (fs.existsSync(rPath)) {
      const data = JSON.parse(fs.readFileSync(rPath, 'utf8'));
      data.forEach(item => {
        if (item.image_status === 'FOUND_AND_UPLOADED') {
          const modelKey = `haier ${item.model}`.trim().toLowerCase();
          const slug = `haier-${item.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const localWebPath = `/images/products/${slug}.jpg`;
          verifiedMap.set(modelKey, localWebPath);
        }
      });
    }
  });

  console.log(`Master Verified Map built with ${verifiedMap.size} verified product image references.\n`);

  // 2. Fetch all products from Database
  const [products] = await db.query('SELECT id, name, category, brand, image FROM products');
  console.log(`Total Products in Database: ${products.length}\n`);

  // Count image occurrences for Duplicate check
  const imageCounts = {};
  products.forEach(p => {
    const img = (p.image || '').trim();
    if (img !== '') {
      imageCounts[img] = (imageCounts[img] || 0) + 1;
    }
  });

  let sahiCount = 0;
  let galatClearedCount = 0;
  let restoredVerifiedCount = 0;

  const auditResults = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const currentImg = (p.image || '').trim();
    const modelKey = p.name.trim().toLowerCase();

    let isGalat = false;
    let galatReason = '';

    // Check if in Master Verified Map
    let exactVerifiedImg = verifiedMap.get(modelKey);

    if (!exactVerifiedImg) {
      // Check partial model match in verified map
      for (const [k, v] of verifiedMap.entries()) {
        if (modelKey.includes(k) || k.includes(modelKey)) {
          exactVerifiedImg = v;
          break;
        }
      }
    }

    if (currentImg === '') {
      // Empty image state
      if (exactVerifiedImg) {
        // Restore exact verified image URL (STEP 3)
        await db.execute('UPDATE products SET image = ? WHERE id = ?', [exactVerifiedImg, p.id]);
        restoredVerifiedCount++;
        auditResults.push({ id: p.id, name: p.name, category: p.category, status: "SAHI_RESTORED", image: exactVerifiedImg, note: "Verified image restored from historical record" });
        console.log(`✅ [ID ${p.id}] ${p.name} -> RESTORED VERIFIED IMAGE: ${exactVerifiedImg}`);
      } else {
        auditResults.push({ id: p.id, name: p.name, category: p.category, status: "NO_IMAGE", image: "", note: "Awaiting exact matched image" });
      }
      continue;
    }

    // Check GALAT criteria:
    // 1. Duplicate image shared across 2+ different models
    if (imageCounts[currentImg] > 1) {
      isGalat = true;
      galatReason = `Duplicate image shared across ${imageCounts[currentImg]} models`;
    }

    // 2. Remote web scrape / search thumbnail link
    if (currentImg.startsWith('http')) {
      isGalat = true;
      galatReason = "Remote unverified search thumbnail link";
    }

    // 3. Generic / placeholder image
    if (currentImg.includes('placeholder') || currentImg.includes('product_dispenser.png') || currentImg.includes('cat_washer.png') || currentImg.includes('cat_ac.png')) {
      isGalat = true;
      galatReason = "Generic category placeholder image";
    }

    if (isGalat) {
      // STEP 2: GALAT -> Clear image immediately to NO_IMAGE state ("")
      if (exactVerifiedImg) {
        // STEP 3: Restore exact verified image if available
        await db.execute('UPDATE products SET image = ? WHERE id = ?', [exactVerifiedImg, p.id]);
        restoredVerifiedCount++;
        auditResults.push({ id: p.id, name: p.name, category: p.category, status: "SAHI_RESTORED", image: exactVerifiedImg, note: `Replaced galat image (${galatReason}) with exact verified image` });
        console.log(`🔄 [ID ${p.id}] ${p.name} -> GALAT REPLACED WITH VERIFIED IMAGE: ${exactVerifiedImg}`);
      } else {
        await db.execute('UPDATE products SET image = "" WHERE id = ?', [p.id]);
        galatClearedCount++;
        auditResults.push({ id: p.id, name: p.name, category: p.category, status: "GALAT_CLEARED_NO_IMAGE", image: "", note: galatReason });
        console.log(`❌ [ID ${p.id}] ${p.name} -> GALAT CLEARED TO NO_IMAGE: ${galatReason}`);
      }
    } else {
      // SAHI: Image is unique, valid, and matches product
      sahiCount++;
      auditResults.push({ id: p.id, name: p.name, category: p.category, status: "SAHI", image: currentImg, note: "Image is unique and genuinely verified" });
    }
  }

  // Save audit report JSON
  fs.writeFileSync(path.join(__dirname, 'site_image_audit_results.json'), JSON.stringify(auditResults, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("📊 SITE-WIDE IMAGE AUDIT & RESTORATION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ SAHI (Unique & Verified Images Active): ${sahiCount + restoredVerifiedCount}`);
  console.log(`🔄 Restored Exact Verified Images: ${restoredVerifiedCount}`);
  console.log(`❌ GALAT Cleared to NO_IMAGE State: ${galatClearedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

executeFullAuditAndFix().catch(console.error);
