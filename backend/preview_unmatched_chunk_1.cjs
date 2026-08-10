const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
const rows = [];

if (!fs.existsSync(unmatchedCsvPath)) {
  console.log("UNMATCHED_Products_List.csv does not exist!");
  process.exit(1);
}

fs.createReadStream(unmatchedCsvPath)
  .pipe(csv())
  .on('data', (data) => rows.push(data))
  .on('end', () => {
    console.log(`Total Unmatched Items Loaded: ${rows.length}`);

    const catPriority = {
      'AC': 1,
      'Washing Machine': 2,
      'Microwave': 3,
      'LED': 4,
      'Water Dispenser': 5,
      'Kitchen Appliance': 6
    };

    rows.sort((a, b) => {
      const pA = catPriority[a.Category] || 99;
      const pB = catPriority[b.Category] || 99;
      if (pA !== pB) return pA - pB;
      return (a.Brand || '').localeCompare(b.Brand || '');
    });

    const chunk1 = rows.slice(0, 50);

    console.log("=== UNMATCHED BATCH - CHUNK 1 (PRODUCTS 1 TO 50) PREVIEW ===");
    console.log(`Total in Chunk 1: ${chunk1.length} products\n`);

    chunk1.forEach((r, idx) => {
      console.log(`${idx + 1}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
