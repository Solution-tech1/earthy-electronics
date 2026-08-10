const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const unmatchedCsvPath = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
const rows = [];

fs.createReadStream(unmatchedCsvPath)
  .pipe(csv())
  .on('data', (d) => rows.push(d))
  .on('end', () => {
    const haierRows = rows.filter(r => {
      const b = (r.Brand || '').toLowerCase();
      const m = (r.Model_Name || '').toLowerCase();
      return b.includes('haier') || m.startsWith('hwm') || m.startsWith('hw-') || m.startsWith('hmn') || m.startsWith('hmw') || m.startsWith('hgl') || m.startsWith('hmo') || m.startsWith('hwd');
    });

    const chunk2 = haierRows.slice(50, 120);

    console.log("=== BRAND 2 (HAIER) — ENHANCED CHUNK 2 (PRODUCTS 51 TO 120) PREVIEW ===");
    console.log(`Total in Chunk 2: ${chunk2.length} products\n`);

    chunk2.forEach((r, idx) => {
      console.log(`${idx + 51}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
