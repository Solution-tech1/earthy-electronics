const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const file = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
const rows = [];

if (fs.existsSync(file)) {
  fs.createReadStream(file)
    .pipe(csv())
    .on('data', d => rows.push(d))
    .on('end', () => {
      const uniqueMap = new Map();
      rows.forEach(r => {
        const key = ((r.Brand || '') + '|' + (r.Model_Name || '')).toLowerCase().trim();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, r);
        }
      });

      const cleanRows = Array.from(uniqueMap.values());
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Match_Notes\n';
      let body = cleanRows.map((r, idx) => {
        return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${r.Image_URL || ''}","${(r.Match_Notes || '').replace(/"/g, '""')}"`;
      }).join('\n');

      fs.writeFileSync(file, header + body, 'utf8');

      console.log("==================================================");
      console.log(`TOTAL UNIQUE PARTIAL MATCH PRODUCTS: ${cleanRows.length}`);
      console.log("==================================================");

      const b = {};
      cleanRows.forEach(r => {
        b[r.Brand] = (b[r.Brand] || 0) + 1;
      });
      console.log("BRAND BREAKDOWN:", b);
      console.log("==================================================\n");

      process.exit(0);
    });
}
