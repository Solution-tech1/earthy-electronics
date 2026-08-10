const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
const rows = [];

fs.createReadStream(readyCsvPath)
  .pipe(csv())
  .on('data', (d) => rows.push(d))
  .on('end', () => {
    console.log(`Total Rows in Products_WITH_Images_READY.csv: ${rows.length}`);
    if (rows.length > 0) {
      console.log("Sample Keys:", Object.keys(rows[0]));
      console.log("First 5 Items:");
      rows.slice(0, 5).forEach((r, idx) => {
        console.log(`[${idx+1}] Name: "${r.Model_Name || r.name || r.title}" | Image_URL: "${r.Image_URL || r.image}"`);
      });
    }
  });
