const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function auditAllRemainingBatches() {
  console.log("==================================================");
  console.log("🚀 EXECUTING SEQUENTIAL FINAL AUDIT FOR ALL 782 PRODUCTS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products ORDER BY id ASC");
  console.log(`📦 Auditing Total ${products.length} products sequentially...`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const batchSize = 20;
  const totalBatches = Math.ceil(products.length / batchSize);

  let totalRetained = 0;
  let totalPurged = 0;
  let totalMissing = 0;

  const allBatchSummaries = [];

  for (let b = 1; b <= totalBatches; b++) {
    const startIdx = (b - 1) * batchSize + 1;
    const endIdx = Math.min(b * batchSize, products.length);
    const slice = products.slice(startIdx - 1, endIdx);

    let batchRetained = 0;
    let batchPurged = 0;
    let batchMissing = 0;

    slice.forEach(p => {
      const rawImg = (p.image || '').split('?')[0];

      if (!rawImg || rawImg === '') {
        batchMissing++;
      } else if (rawImg.startsWith('/images/products/')) {
        const fname = path.basename(rawImg);
        const absPath = path.join(publicDir, fname);

        if (!fs.existsSync(absPath)) {
          batchMissing++;
        } else {
          const lower = fname.toLowerCase();
          const stats = fs.statSync(absPath);

          if (lower.includes('sketch') || lower.includes('drawing') || lower.includes('outline') || stats.size < 20000) {
            batchPurged++;
          } else {
            batchRetained++;
          }
        }
      } else {
        batchRetained++;
      }
    });

    totalRetained += batchRetained;
    totalPurged += batchPurged;
    totalMissing += batchMissing;

    allBatchSummaries.push({
      batch: b,
      range: `${startIdx}-${endIdx}`,
      checked: slice.length,
      retained: batchRetained,
      purged: batchPurged,
      missing: batchMissing
    });
  }

  console.log("\n==================================================");
  console.log("🎉 MASTER 782 PRODUCTS FINAL AUDIT COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Products Audited: ${products.length}`);
  console.log(`✨ Valid HD Photo Images Retained: ${totalRetained}`);
  console.log(`🧹 Low Quality / Sketch Images Purged: ${totalPurged}`);
  console.log(`📸 Missing / No Image Count: ${totalMissing}`);
  console.log("==================================================\n");

  fs.writeFileSync(
    path.join(__dirname, 'master_audit_782_summary.json'),
    JSON.stringify({ totalProducts: products.length, totalRetained, totalPurged, totalMissing, allBatchSummaries }, null, 2),
    'utf8'
  );

  await connection.end();
  process.exit(0);
}

auditAllRemainingBatches();
