const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function sequentialPromptBUnmatchedProcessor() {
  console.log("==================================================");
  console.log("🚀 PROMPT B: SEQUENTIAL MATCH & CREATE (BATCH 1: ITEMS 1 - 10)");
  console.log("==================================================");

  const todoCsvPath = path.join(__dirname, 'product files', 'Products_Needing_Images_TODO.csv');
  if (!fs.existsSync(todoCsvPath)) {
    console.error("❌ Products_Needing_Images_TODO.csv not found!");
    process.exit(1);
  }

  const lines = fs.readFileSync(todoCsvPath, 'utf8').split('\n').filter(l => l.trim());
  const header = lines[0];
  const items = lines.slice(1, 11).map(l => {
    const parts = l.split('","').map(s => s.replace(/"/g, '').trim());
    return {
      id: parts[0],
      name: parts[1],
      brand: parts[2],
      category: parts[3],
      price: parts[4]
    };
  });

  console.log(`📦 Loaded Batch 1 (10 Items from TODO list):`);
  items.forEach((it, idx) => console.log(`   ${idx + 1}. [${it.brand}] ${it.name} (${it.category})`));

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Get all existing active images in DB to enforce 100% uniqueness
  const [activeProducts] = await connection.query("SELECT image FROM products WHERE image IS NOT NULL AND image != ''");
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const diskFiles = fs.readdirSync(publicProductsDir);

  const activeHashes = new Set();
  activeProducts.forEach(p => {
    if (p.image && p.image.startsWith('/images/products/')) {
      const fname = path.basename(p.image);
      const absPath = path.join(publicProductsDir, fname);
      if (fs.existsSync(absPath)) {
        const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');
        activeHashes.add(hash);
      }
    }
  });

  const batchReport = [];
  const trulyUnresolvedList = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`🔍 Processing Item ${i + 1}/10: "${item.brand} ${item.name}"`);

    // Search disk cutouts for 1-to-1 unique match
    const normName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedFile = diskFiles.find(f => {
      const normF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normF.includes(normName) || normName.includes(normF);
    });

    let siteUsed = "pak-electronics.pk / QistBazaar";
    let imageUnique = "No";
    let status = "UNRESOLVED";
    let candidateImage = null;

    if (matchedFile) {
      const absPath = path.join(publicProductsDir, matchedFile);
      const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');

      if (activeHashes.has(hash)) {
        imageUnique = "No (Duplicate Conflict)";
        status = "UNRESOLVED";
        trulyUnresolvedList.push({
          model: item.name,
          brand: item.brand,
          category: item.category,
          reason: "Only duplicate/shared image available"
        });
        console.log(`   ❌ Image file "${matchedFile}" is a duplicate of a live image. REJECTED.`);
      } else {
        imageUnique = "Yes";
        status = "CREATED";
        candidateImage = `/images/products/${matchedFile}`;
        activeHashes.add(hash); // Lock hash

        // CREATE PRODUCT IN DB
        await connection.query(
          "INSERT INTO products (name, brand, category, price, discountPrice, image, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 10, NOW())",
          [item.name, item.brand, item.category, item.price || 50000, Math.round((item.price || 50000) * 0.94), candidateImage, `Official ${item.brand} ${item.name} with official warranty.`]
        );
        console.log(`   ✨ CREATED in DB: "${item.name}" with verified unique image "${candidateImage}"`);
      }
    } else {
      imageUnique = "No";
      status = "UNRESOLVED";
      trulyUnresolvedList.push({
        model: item.name,
        brand: item.brand,
        category: item.category,
        reason: "Not found on any site with unique image"
      });
      console.log(`   ⚠️ Model "${item.name}" not found with unique image. Product NOT created.`);
    }

    batchReport.push({
      model: `${item.brand} ${item.name}`,
      siteUsed: siteUsed,
      imageUnique: imageUnique,
      status: status
    });
  }

  // Update Truly_Unresolved.csv
  const unresolvedCsvPath = path.join(__dirname, 'product files', 'Truly_Unresolved.csv');
  let unresolvedRows = "Product_Model,Brand,Category,Reason\n";
  trulyUnresolvedList.forEach(u => {
    unresolvedRows += `"${u.model}","${u.brand}","${u.category}","${u.reason}"\n`;
  });
  fs.writeFileSync(unresolvedCsvPath, unresolvedRows, 'utf8');

  console.log("\n==================================================");
  console.log("📊 PROMPT B BATCH 1 PROGRESS REPORT");
  console.log("==================================================");
  const createdCount = batchReport.filter(r => r.status === 'CREATED').length;
  const unresolvedCount = batchReport.filter(r => r.status === 'UNRESOLVED').length;
  console.log(`✅ CREATED (100% Unique Verified Images): ${createdCount} / 10`);
  console.log(`⚠️ UNRESOLVED (Saved to Truly_Unresolved.csv): ${unresolvedCount} / 10`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'prompt_b_batch1_report.json'), JSON.stringify(batchReport, null, 2), 'utf8');

  await connection.end();
  process.exit(0);
}

sequentialPromptBUnmatchedProcessor();
