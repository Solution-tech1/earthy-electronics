const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
const rows = [];

fs.createReadStream(unmatchedCsvPath)
  .pipe(csv())
  .on('data', (d) => rows.push(d))
  .on('end', () => {
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

    const chunk7 = rows.slice(300, 350);

    console.log("=== UNMATCHED BATCH - CHUNK 7 (PRODUCTS 301 TO 350) PREVIEW ===");
    console.log(`Total in Chunk 7: ${chunk7.length} products\n`);

    chunk7.forEach((r, idx) => {
      console.log(`${idx + 301}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
