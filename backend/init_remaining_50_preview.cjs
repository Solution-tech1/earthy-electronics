const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const sourceFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
const rows = [];

if (fs.existsSync(sourceFile)) {
  fs.createReadStream(sourceFile)
    .pipe(csv())
    .on('data', d => rows.push(d))
    .on('end', () => {
      // Items 24 to 73 (50 items)
      const remaining50 = rows.slice(23);

      console.log("==================================================");
      console.log("📊 REMAINING 50 PRODUCTS (ITEMS #24 TO #73) BRAND BREAKDOWN");
      console.log("==================================================");
      console.log(`• Total Items in Working Queue: ${remaining50.length}`);

      const brandCounts = {};
      remaining50.forEach((r, idx) => {
        const b = (r.Brand || 'Other').trim();
        brandCounts[b] = (brandCounts[b] || 0) + 1;
      });

      Object.entries(brandCounts).forEach(([b, cnt]) => {
        console.log(`  - ${b}: ${cnt} products`);
      });

      console.log("\nFirst Brand to process: BRAND 1 (HAIER - 9 Products remaining in items #24 to #32)");
      console.log("==================================================\n");

      process.exit(0);
    });
}
