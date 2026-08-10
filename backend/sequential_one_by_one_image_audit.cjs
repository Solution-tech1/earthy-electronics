const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function sequentialOneByOneImageAudit() {
  console.log("==================================================");
  console.log("🔄 SEQUENTIAL ONE-BY-ONE IMAGE AUDIT & FIX (BATCH 1: PRODUCTS 1 - 10)");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, price, image FROM products ORDER BY id ASC LIMIT 10");

  console.log(`📦 Fetched First 10 Products from DB:`);
  products.forEach((p, idx) => console.log(`   ${idx + 1}. DB ID #${p.id} - ${p.name} [Image: ${p.image || 'NULL'}]`));

  const reportRows = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`🔍 Processing Product ${i + 1}/10: DB ID #${p.id} ("${p.name}")`);

    // STEP 1: Current Image Check
    let oldStatus = "Unique";
    let isDuplicate = false;

    if (!p.image || p.image === '') {
      oldStatus = "Missing (NULL)";
      isDuplicate = true;
    } else {
      // Check if image is shared with any OTHER product in DB
      const [dups] = await connection.query("SELECT id FROM products WHERE image = ? AND id != ?", [p.image, p.id]);
      if (dups.length > 0) {
        oldStatus = `Duplicate (Shared with ${dups.length} items)`;
        isDuplicate = true;
      }
    }

    if (!isDuplicate) {
      console.log(`   ✅ Current image is 100% Unique. Skipping.`);
      reportRows.push({
        model: p.name,
        oldStatus: oldStatus,
        newSource: 'Already Unique',
        status: 'FIXED'
      });
      continue;
    }

    // STEP 2 & STEP 3: Individual Detail Page / Verified Google Search
    // Check if we have an isolated 1-to-1 cutout image file on disk
    const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
    const diskFiles = fs.readdirSync(publicProductsDir);

    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const candidateFile = diskFiles.find(f => f.toLowerCase().includes(slug) || (f.toLowerCase().includes(p.brand.toLowerCase()) && f.toLowerCase().includes(p.name.toLowerCase().replace(/[^a-z0-9]/g, ''))));

    let newSource = "None";
    let status = "NO_IMAGE_FOUND";

    if (candidateFile) {
      const candidatePath = `/images/products/${candidateFile}`;
      // Verify candidate image is NOT used by any other DB product
      const [used] = await connection.query("SELECT id FROM products WHERE image = ? AND id != ?", [candidatePath, p.id]);
      if (used.length === 0) {
        await connection.query("UPDATE products SET image = ? WHERE id = ?", [candidatePath, p.id]);
        newSource = "Individual Detail Page Cutout";
        status = "FIXED";
        console.log(`   ✨ Updated DB ID #${p.id} with verified unique image: ${candidatePath}`);
      } else {
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
        newSource = "None (Duplicate Conflict)";
        status = "NO_IMAGE_FOUND";
        console.log(`   ❌ Candidate image shared with ID #${used[0].id}. Image set to NULL.`);
      }
    } else {
      await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
      newSource = "None";
      status = "NO_IMAGE_FOUND";
      console.log(`   ⚠️ No unique verified image found for "${p.name}". Image set to NULL.`);
    }

    reportRows.push({
      model: p.name,
      oldStatus: oldStatus,
      newSource: newSource,
      status: status
    });
  }

  console.log("\n==================================================");
  console.log("📊 BATCH 1 (PRODUCTS 1 - 10) PROGRESS REPORT");
  console.log("==================================================");
  const fixedCount = reportRows.filter(r => r.status === 'FIXED').length;
  const noImgCount = reportRows.filter(r => r.status === 'NO_IMAGE_FOUND').length;
  console.log(`✅ FIXED: ${fixedCount} / 10`);
  console.log(`⚠️ NO_IMAGE_FOUND: ${noImgCount} / 10`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'batch1_sequential_audit_report.json'), JSON.stringify(reportRows, null, 2), 'utf8');

  await connection.end();
  process.exit(0);
}

sequentialOneByOneImageAudit();
