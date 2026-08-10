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

    const chunk4 = wpRows.slice(150, 204);

    console.log("=== BRAND 7 (WESTPOINT) — CHUNK 4 (PRODUCTS 151 TO 204) PREVIEW ===");
    console.log(`Total in Chunk 4: ${chunk4.length} products\n`);

    chunk4.forEach((r, idx) => {
      console.log(`${idx + 151}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
