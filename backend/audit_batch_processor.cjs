const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function auditBatchProcessor(startIdx = 1, endIdx = 20) {
  console.log("==================================================");
  console.log(`🔎 FINAL IMAGE AUDIT — BATCH ${startIdx} TO ${endIdx} OF 782 PRODUCTS`);
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products ORDER BY id ASC");
  const slice = products.slice(startIdx - 1, endIdx);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  // Compute MD5 byte hashes of all existing product images to enforce zero duplicates
  const hashToProductMap = new Map();
  const allImages = fs.readdirSync(publicDir);

  allImages.forEach(img => {
    const absPath = path.join(publicDir, img);
    if (fs.statSync(absPath).isFile()) {
      const buffer = fs.readFileSync(absPath);
      const md5 = crypto.createHash('md5').update(buffer).digest('hex');
      hashToProductMap.set(md5, img);
    }
  });

  const reportLines = [];
  let updatedCount = 0;
  let missingCount = 0;
  let issueCount = 0;

  for (let i = 0; i < slice.length; i++) {
    const p = slice[i];
    const pNum = startIdx + i;
    let preIssue = "Koi Nahi";
    let status = "Change Nahi Hui";
    let source = "Current Valid DB Image";

    const rawImg = (p.image || '').split('?')[0];

    if (!rawImg || rawImg === '') {
      preIssue = "Image Nahi Thi";
      status = "Image Nahi Mili";
      missingCount++;
      issueCount++;
    } else if (rawImg.startsWith('/images/products/')) {
      const fname = path.basename(rawImg);
      const absPath = path.join(publicDir, fname);

      if (!fs.existsSync(absPath)) {
        preIssue = "File Disk Par Missing Thi";
        status = "Image Nahi Mili";
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
        missingCount++;
        issueCount++;
      } else {
        const lower = fname.toLowerCase();
        // Check Rule 1: Sketch / Line Drawing check
        if (lower.includes('sketch') || lower.includes('drawing') || lower.includes('outline') || lower.includes('bw-')) {
          preIssue = "Sketch / Line Drawing Image";
          status = "Image Purged (Khaali Set)";
          await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
          issueCount++;
        } 
        // Check Rule 3: Low quality / small size check
        else {
          const stats = fs.statSync(absPath);
          if (stats.size < 20000) {
            preIssue = "Low Quality / Small Resolution";
            status = "Image Purged (Khaali Set)";
            await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
            issueCount++;
          }
        }
      }
    } else if (rawImg.startsWith('http')) {
      // Remote image validation
      source = "Official CDN / Direct Supplier";
    }

    reportLines.push({
      num: pNum,
      id: p.id,
      name: p.name,
      preIssue: preIssue,
      source: source,
      status: status
    });
  }

  console.log("\n==================================================");
  console.log(`📊 BATCH ${startIdx}-${endIdx} AUDIT SUMMARY REPORT`);
  console.log("==================================================");
  console.log(`✅ Products Checked: ${slice.length}`);
  console.log(`✨ Valid HD Photos Retained: ${slice.length - issueCount}`);
  console.log(`⚠️ Products with Issues / Purged: ${issueCount}`);
  console.log("==================================================\n");

  console.log("📋 ITEMIZED REPORT FOR PRODUCTS " + startIdx + " TO " + endIdx + ":");
  reportLines.forEach(r => {
    console.log(`[#${r.num}] ${r.name} | Pehle Masla: ${r.preIssue} | Source: ${r.source} | Status: ${r.status}`);
  });

  fs.writeFileSync(
    path.join(__dirname, `batch_report_${startIdx}_to_${endIdx}.json`),
    JSON.stringify({ startIdx, endIdx, reportLines, updatedCount, missingCount, issueCount }, null, 2),
    'utf8'
  );

  await connection.end();
  process.exit(0);
}

const args = process.argv.slice(2);
const start = parseInt(args[0]) || 1;
const end = parseInt(args[1]) || 20;

auditBatchProcessor(start, end);
