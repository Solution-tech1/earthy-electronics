const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function preUploadDeduplicationAudit() {
  console.log("==================================================");
  console.log("🔒 STRICT PRE-UPLOAD CROSS-DUPLICATION AUDIT");
  console.log("==================================================");

  const reportPath = path.join(__dirname, 'remaining_60_verification_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error("Error: remaining_60_verification_report.json missing");
    return;
  }

  const newCandidates = JSON.parse(fs.readFileSync(reportPath, 'utf8')).filter(r => r.confidenceLevel === 'VERIFIED_SAME_PRODUCT' || r.confidenceLevel === 'LIKELY_SAME_SPECS_MATCH');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [dbProducts] = await connection.query("SELECT id, name, brand, category, price, image FROM products");
  await connection.end();

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  // Compute MD5 hash of all existing DB images
  const dbImageHashes = new Map();
  dbProducts.forEach(p => {
    if (p.image && p.image.startsWith('/images/products/')) {
      const fname = path.basename(p.image);
      const abs = path.join(publicProductsDir, fname);
      if (fs.existsSync(abs)) {
        const hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
        dbImageHashes.set(hash, p.name);
      }
    }
  });

  const readyToUploadList = [];
  const existingOnSiteList = [];
  const duplicateImageConflictList = [];

  for (const item of newCandidates) {
    const listModel = item.listModel;
    const dbMatch = dbProducts.find(p => p.name.toLowerCase() === listModel.toLowerCase());

    if (dbMatch) {
      existingOnSiteList.push({
        model: listModel,
        existingId: dbMatch.id,
        reason: `Model Name already exists on site as DB ID #${dbMatch.id}`
      });
      continue;
    }

    // Check image file MD5 hash uniqueness
    const slug = listModel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const imgFileName = `${slug}.jpg`;
    const imgAbsPath = path.join(publicProductsDir, imgFileName);

    if (fs.existsSync(imgAbsPath)) {
      const newHash = crypto.createHash('md5').update(fs.readFileSync(imgAbsPath)).digest('hex');
      if (dbImageHashes.has(newHash)) {
        duplicateImageConflictList.push({
          model: listModel,
          imageFile: imgFileName,
          sharedWithDbProduct: dbImageHashes.get(newHash),
          reason: `Image file hash identical to existing DB product: "${dbImageHashes.get(newHash)}"`
        });
        continue;
      }
    }

    readyToUploadList.push({
      sno: item.sno,
      model: listModel,
      category: item.category,
      image: `/images/products/${imgFileName}`,
      confidence: item.confidenceLevel,
      status: "READY_TO_UPLOAD"
    });
  }

  console.log("\n==================================================");
  console.log("📊 PRE-UPLOAD DEDUPLICATION AUDIT SUMMARY");
  console.log("==================================================");
  console.log(`✅ 100% UNIQUE & READY TO UPLOAD: ${readyToUploadList.length}`);
  console.log(`🔄 ALREADY LIVE ON SITE (Will Update Existing): ${existingOnSiteList.length}`);
  console.log(`❌ DUPLICATE IMAGE CONFLICTS (Excluded from Upload): ${duplicateImageConflictList.length}`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'pre_upload_deduplication_results.json'), JSON.stringify({
    ready: readyToUploadList,
    alreadyLive: existingOnSiteList,
    duplicateImages: duplicateImageConflictList
  }, null, 2), 'utf8');

  process.exit(0);
}

preUploadDeduplicationAudit();
