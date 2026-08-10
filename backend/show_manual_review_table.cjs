const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const manualFile = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
const rows = [];

if (fs.existsSync(manualFile)) {
  fs.createReadStream(manualFile)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', () => {
      console.log(`==================================================`);
      console.log(`📋 NEEDS_MANUAL_REVIEW.CSV AUDIT REPORT`);
      console.log(`📦 Total Items Needing Manual Review: ${rows.length}`);
      console.log(`==================================================\n`);

      rows.forEach((r, idx) => {
        console.log(`${idx + 1}. [${r.Brand}] ${r.Model_Name} | Cat: ${r.Category} | Notes: ${r.Match_Notes} | Image: ${r.Image_URL}`);
      });

      process.exit(0);
    });
} else {
  console.log("No Needs_Manual_Review.csv file found!");
  process.exit(0);
}
