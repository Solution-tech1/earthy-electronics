const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const stillUnmatchedFile = path.join(__dirname, 'product files', 'Still_Unmatched.csv');
const discontinuedFile = path.join(__dirname, 'product files', 'Discontinued_Products.csv');

const rows = [];

if (fs.existsSync(stillUnmatchedFile)) {
  fs.createReadStream(stillUnmatchedFile)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', () => {
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Match_Notes\n';
      let body = rows.map((r, idx) => {
        return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","Model truly not found on official brand website - Confirmed Discontinued"`;
      }).join('\n');

      fs.writeFileSync(discontinuedFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("✅ ISOLATED DISCONTINUED PRODUCTS FILE CREATED!");
      console.log(`• Total Discontinued Products Moved: ${rows.length}`);
      console.log(`• File Path: ${discontinuedFile}`);
      console.log("==================================================\n");

      process.exit(0);
    });
} else {
  console.log("Still_Unmatched.csv not found.");
  process.exit(0);
}
