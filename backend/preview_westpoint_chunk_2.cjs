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

    const chunk2 = wpRows.slice(50, 100);

    console.log("=== BRAND 7 (WESTPOINT) — CHUNK 2 (PRODUCTS 51 TO 100) PREVIEW ===");
    console.log(`Total in Chunk 2: ${chunk2.length} products\n`);

    chunk2.forEach((r, idx) => {
      console.log(`${idx + 51}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
