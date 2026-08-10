const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const sourceFile = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
const groupAFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');

const rows = [];

if (fs.existsSync(sourceFile)) {
  fs.createReadStream(sourceFile)
    .pipe(csv())
    .on('data', d => rows.push(d))
    .on('end', () => {
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
      let body = rows.map((r, idx) => {
        return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${r.Image_URL || ''}","UNVERIFIED","${(r.Match_Notes || '').replace(/"/g, '""')}"`;
      }).join('\n');

      fs.writeFileSync(groupAFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("✅ GROUP A (CDN_Unverified.csv) INITIALIZED!");
      console.log(`• Total Products in Group A: ${rows.length}`);
      console.log("==================================================");

      const brandCounts = {};
      rows.forEach(r => {
        const b = (r.Brand || 'Other').trim();
        brandCounts[b] = (brandCounts[b] || 0) + 1;
      });

      console.log("\n=== GROUP A BRAND BREAKDOWN ===");
      Object.entries(brandCounts).forEach(([b, cnt]) => {
        console.log(`  - ${b}: ${cnt} products`);
      });

      process.exit(0);
    });
}
