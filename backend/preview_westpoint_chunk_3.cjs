const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
const rows = [];

fs.createReadStream(unmatchedCsvPath)
  .pipe(csv())
  .on('data', (d) => rows.push(d))
  .on('end', () => {
    const wpRows = rows.filter(r => {
      const b = (r.Brand || '').toLowerCase();
      return b.includes('westpoint');
    });

    const chunk3 = wpRows.slice(100, 150);

    console.log("=== BRAND 7 (WESTPOINT) — CHUNK 3 (PRODUCTS 101 TO 150) PREVIEW ===");
    console.log(`Total in Chunk 3: ${chunk3.length} products\n`);

    chunk3.forEach((r, idx) => {
      console.log(`${idx + 101}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
