const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readCsvCount = (filePath) => {
  return new Promise((resolve) => {
    const results = [];
    if (fs.existsSync(filePath)) {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (d) => results.push(d))
        .on('end', () => resolve(results.length));
    } else {
      resolve(0);
    }
  });
};

async function getSummary() {
  const discontinuedCount = await readCsvCount(path.join(__dirname, 'product files', 'Discontinued_Products.csv'));
  const manualCount = await readCsvCount(path.join(__dirname, 'product files', 'Needs_Manual_Review.csv'));
  const stillUnmatchedCount = await readCsvCount(path.join(__dirname, 'product files', 'Still_Unmatched.csv'));

  console.log("==================================================");
  console.log("📊 EXACT UNMATCHED & OLD MODELS SUMMARY");
  console.log("==================================================");
  console.log(`❌ Discontinued / Old Models File (Discontinued_Products.csv): ${discontinuedCount}`);
  console.log(`⚠️ Unverified CDN / Needs Review (Needs_Manual_Review.csv): ${manualCount}`);
  console.log(`📋 Unmatched Brand Models Queue (Still_Unmatched.csv): ${stillUnmatchedCount}`);
  console.log(`TOTAL REMAINING UNMATCHED MODELS: ${discontinuedCount + manualCount + stillUnmatchedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

getSummary().catch(console.error);
