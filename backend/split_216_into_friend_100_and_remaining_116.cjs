const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readCsv = (filePath) => {
  return new Promise((resolve) => {
    const results = [];
    if (fs.existsSync(filePath)) {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (d) => results.push(d))
        .on('end', () => resolve(results));
    } else {
      resolve([]);
    }
  });
};

async function split216IntoFriend100AndRemaining116() {
  const sourcePath = path.join(__dirname, 'product files', 'Still_Unmatched.csv');
  const rows = await readCsv(sourcePath);

  const friend100 = rows.slice(0, 100);
  const remaining116 = rows.slice(100);

  const header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Match_Notes\n';

  // Write Friend 100 CSV
  const body100 = friend100.map((r, idx) => {
    return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${(r.Match_Notes || '').replace(/"/g, '""')}"`;
  }).join('\n');
  fs.writeFileSync(path.join(__dirname, 'product files', 'Friend_Batch_100_Products.csv'), header + body100, 'utf8');

  // Write Remaining 116 CSV
  const body116 = remaining116.map((r, idx) => {
    return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${(r.Match_Notes || '').replace(/"/g, '""')}"`;
  }).join('\n');
  fs.writeFileSync(path.join(__dirname, 'product files', 'Remaining_116_Products.csv'), header + body116, 'utf8');

  // Generate Markdown for Friend 100
  let md100 = "# 🎁 Friend's Batch: First 100 Unmatched Products\n\n";
  md100 += "| S.No | Brand | Category | Model Name | Rate |\n|---|---|---|---|---|\n";
  friend100.forEach((r, idx) => {
    md100 += `| ${idx + 1} | ${r.Brand || 'Generic'} | ${r.Category || 'Appliance'} | ${r.Model_Name || ''} | ${r.Rate || ''} |\n`;
  });
  fs.writeFileSync(path.join(__dirname, 'Friend_Batch_100_Products.md'), md100, 'utf8');

  // Generate Markdown for Remaining 116
  let md116 = "# 📋 Remaining 116 Unmatched Products\n\n";
  md116 += "| S.No | Brand | Category | Model Name | Rate |\n|---|---|---|---|---|\n";
  remaining116.forEach((r, idx) => {
    md116 += `| ${idx + 1} | ${r.Brand || 'Generic'} | ${r.Category || 'Appliance'} | ${r.Model_Name || ''} | ${r.Rate || ''} |\n`;
  });
  fs.writeFileSync(path.join(__dirname, 'Remaining_116_Products.md'), md116, 'utf8');

  console.log("==================================================");
  console.log("✅ 216 PRODUCTS SUCCESSFULLY SPLIT!");
  console.log(`• Friend's Batch (First 100 Items): ${friend100.length} products`);
  console.log(`• Remaining Queue (Next 116 Items): ${remaining116.length} products`);
  console.log("==================================================\n");

  process.exit(0);
}

split216IntoFriend100AndRemaining116().catch(console.error);
