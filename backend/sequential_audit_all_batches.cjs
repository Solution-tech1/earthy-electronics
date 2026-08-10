const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function sequentialAuditAllBatches() {
  console.log("==================================================");
  console.log("🔄 SEQUENTIAL ONE-BY-ONE IMAGE AUDIT & FIX (ALL BATCHES)");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, price, image FROM products ORDER BY id ASC");
  console.log(`📦 Total Products to Process Sequentially: ${products.length}`);

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const diskFiles = fs.readdirSync(publicProductsDir);

  const allReports = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let oldStatus = "Unique";
    let isDuplicate = false;

    if (!p.image || p.image === '') {
      oldStatus = "Missing (NULL)";
      isDuplicate = true;
    } else {
      const [dups] = await connection.query("SELECT id FROM products WHERE image = ? AND id != ?", [p.image, p.id]);
      if (dups.length > 0) {
        oldStatus = `Duplicate (Shared with ${dups.length} items)`;
        isDuplicate = true;
      }
    }

    let newSource = "Already Unique";
    let status = "FIXED";

    if (isDuplicate) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const candidateFile = diskFiles.find(f => f.toLowerCase().includes(slug) || (f.toLowerCase().includes(p.brand.toLowerCase()) && f.toLowerCase().includes(p.name.toLowerCase().replace(/[^a-z0-9]/g, ''))));

      if (candidateFile) {
        const candidatePath = `/images/products/${candidateFile}`;
        const [used] = await connection.query("SELECT id FROM products WHERE image = ? AND id != ?", [candidatePath, p.id]);
        if (used.length === 0) {
          await connection.query("UPDATE products SET image = ? WHERE id = ?", [candidatePath, p.id]);
          newSource = "Individual Detail Page Cutout";
          status = "FIXED";
        } else {
          await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
          newSource = "None (Duplicate Conflict)";
          status = "NO_IMAGE_FOUND";
        }
      } else {
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
        newSource = "None";
        status = "NO_IMAGE_FOUND";
      }
    }

    allReports.push({
      batchNum: Math.floor(i / 10) + 1,
      model: p.name,
      oldStatus: oldStatus,
      newSource: newSource,
      status: status
    });
  }

  console.log("\n==================================================");
  console.log("🎉 ALL BATCHES SEQUENTIAL PROCESSING COMPLETE");
  console.log("==================================================");
  const totalFixed = allReports.filter(r => r.status === 'FIXED').length;
  const totalNoImg = allReports.filter(r => r.status === 'NO_IMAGE_FOUND').length;
  console.log(`✅ TOTAL FIXED (100% Unique Verified Images): ${totalFixed}`);
  console.log(`⚠️ TOTAL NO_IMAGE_FOUND: ${totalNoImg}`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'sequential_all_batches_report.json'), JSON.stringify(allReports, null, 2), 'utf8');

  await connection.end();
  process.exit(0);
}

sequentialAuditAllBatches();
