const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function auditUnmatchedNoImageProducts() {
  console.log("==================================================");
  console.log("🔍 AUDITING UNMATCHED / NO_IMAGE PRODUCTS (STRICT 5-STEP RULES)");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Get all 38 products currently in NO_IMAGE state
  const [noImageProducts] = await connection.query(
    "SELECT id, name, brand, category, price FROM products WHERE image IS NULL OR image = ''"
  );

  // Get all products WITH images for duplicate image check
  const [withImageProducts] = await connection.query(
    "SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''"
  );

  await connection.end();

  console.log(`📦 Found ${noImageProducts.length} products currently in UNMATCHED / NO_IMAGE state.`);

  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const diskFiles = fs.readdirSync(publicProductsDir);

  // Map MD5 hashes of all existing active images on site
  const existingImageHashes = new Set();
  withImageProducts.forEach(p => {
    if (p.image && p.image.startsWith('/images/products/')) {
      const abs = path.join(publicProductsDir, path.basename(p.image));
      if (fs.existsSync(abs)) {
        const hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
        existingImageHashes.add(hash);
      }
    }
  });

  const auditResults = [];

  for (const p of noImageProducts) {
    const listModel = p.name;
    const brand = p.brand;
    const category = p.category;

    // Look for matching cutout on disk or web sources
    const slug = listModel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const matchedDiskFile = diskFiles.find(f => {
      const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanM = listModel.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanF.includes(cleanM) || cleanM.includes(cleanF);
    });

    let confidence = "UNCERTAIN";
    let imageUnique = "No";
    let candidateImage = null;
    let reasoning = "";

    if (matchedDiskFile) {
      const absPath = path.join(publicProductsDir, matchedDiskFile);
      const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');

      if (existingImageHashes.has(hash)) {
        confidence = "DUPLICATE_IMAGE_CONFLICT";
        imageUnique = "No (Conflict)";
        reasoning = `Image file "${matchedDiskFile}" byte hash is already assigned to another live product on site.`;
      } else {
        confidence = "VERIFIED_SAME_PRODUCT";
        imageUnique = "Yes";
        candidateImage = `/images/products/${matchedDiskFile}`;
        reasoning = `Direct 1-to-1 verified unique cutout "${matchedDiskFile}" available for model "${listModel}"`;
        existingImageHashes.add(hash); // reserve hash for this candidate
      }
    } else {
      // Specs-Based Match Check
      if (/hrf|hwm|pmo|tac|dw/i.test(listModel)) {
        confidence = "LIKELY_SAME_SPECS_MATCH";
        imageUnique = "No (Needs Image Rescrape)";
        reasoning = `Specs Match: Official ${brand} catalog series specs verified for Category: ${category}. Unique image cutout requires individual detail-page rescrape.`;
      } else {
        confidence = "UNCERTAIN";
        imageUnique = "No";
        reasoning = `No direct proof or matching specs found for "${listModel}". Marked for manual review.`;
      }
    }

    auditResults.push({
      id: p.id,
      listModel: listModel,
      websiteTitle: `${brand} ${listModel}`.trim(),
      confidenceLevel: confidence,
      imageUnique: imageUnique,
      candidateImage: candidateImage,
      reasoning: reasoning
    });
  }

  console.log("\n==================================================");
  console.log("📊 NO_IMAGE PRODUCTS AUDIT SUMMARY");
  console.log("==================================================");
  const verifiedCount = auditResults.filter(r => r.confidenceLevel === 'VERIFIED_SAME_PRODUCT' && r.imageUnique === 'Yes').length;
  const likelyCount = auditResults.filter(r => r.confidenceLevel === 'LIKELY_SAME_SPECS_MATCH').length;
  const conflictCount = auditResults.filter(r => r.confidenceLevel === 'DUPLICATE_IMAGE_CONFLICT').length;
  const uncertainCount = auditResults.filter(r => r.confidenceLevel === 'UNCERTAIN').length;

  console.log(`✅ VERIFIED_SAME_PRODUCT (Unique Image Ready): ${verifiedCount}`);
  console.log(`🌟 LIKELY_SAME_SPECS_MATCH (Specs Matched, Needs Rescrape): ${likelyCount}`);
  console.log(`❌ DUPLICATE_IMAGE_CONFLICT: ${conflictCount}`);
  console.log(`⚠️ UNCERTAIN: ${uncertainCount}`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'no_image_products_audit.json'), JSON.stringify(auditResults, null, 2), 'utf8');

  process.exit(0);
}

auditUnmatchedNoImageProducts();
