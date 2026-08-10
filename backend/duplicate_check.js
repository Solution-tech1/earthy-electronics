const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const csv = require('csv-parser');

async function checkDuplicates() {
  const db = await mysql.createConnection({host:'localhost', user:'root', database:'earthy_elec'});

  const allItems = []; // { source, id_or_name, image }

  // 1. Friend 40
  const reportPath = path.join(__dirname, 'matched_40_user_images_report.json');
  if (fs.existsSync(reportPath)) {
    const items = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    items.forEach(item => {
      if (item.status === 'MATCHED_AND_VERIFIED') {
        allItems.push({ source: 'Friend_40', id_or_name: `${item.brand} ${item.model}`, image: item.targetPath });
      }
    });
  }

  // 2. Ready 73 (LED/Dispenser)
  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  if (fs.existsSync(readyCsvPath)) {
    const text = fs.readFileSync(readyCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('S_No'));
    lines.forEach(l => {
      const parts = l.split(',');
      if (parts.length >= 7) {
        const name = parts[3].trim();
        const url = parts[6].trim();
        if (url && !url.startsWith('data:image')) {
          allItems.push({ source: 'LED_Dispenser', id_or_name: name, image: url });
        }
      }
    });
  }

  // 3. AI Verified (59)
  const [rows] = await db.query("SELECT id, name, image FROM products WHERE image LIKE '/images/products/m5_%'");
  rows.forEach(r => {
    allItems.push({ source: 'AI_Verified', id_or_name: `[ID:${r.id}] ${r.name}`, image: r.image });
  });

  // Check Duplicates by URL
  const imageMap = {};
  const duplicates = [];

  allItems.forEach(item => {
    const imgKey = item.image.toLowerCase();
    if (!imageMap[imgKey]) {
      imageMap[imgKey] = [item];
    } else {
      imageMap[imgKey].push(item);
    }
  });

  for (const [img, arr] of Object.entries(imageMap)) {
    if (arr.length > 1) {
      duplicates.push({ image: img, products: arr });
    }
  }

  console.log(`\n==================================================`);
  console.log(`🔍 DUPLICATE CHECK REPORT`);
  console.log(`==================================================`);
  console.log(`Total Products Analyzed: ${allItems.length}`);
  console.log(`Total Unique Images: ${Object.keys(imageMap).length}`);
  console.log(`Duplicate Groups Found: ${duplicates.length}\n`);

  if (duplicates.length > 0) {
    duplicates.forEach((grp, i) => {
      console.log(`Duplicate Group ${i + 1}:`);
      grp.products.forEach(p => {
        console.log(`  - [${p.source}] ${p.id_or_name}`);
      });
      console.log(`  🔗 Image: ${grp.image}\n`);
    });
  } else {
    console.log("✅ NO DUPLICATES FOUND! All images are 100% unique.");
  }

  await db.end();
}

checkDuplicates().catch(console.error);
