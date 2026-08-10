const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const readCsv = (filePath) => {
  return new Promise((resolve) => {
    const results = [];
    if (fs.existsSync(filePath)) {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (d) => results.push(d))
        .on('end', () => resolve(results));
    } else {
      resolve([]);
    }
  });
};

async function initBrandChunkPreview() {
  const unverifiedFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const stillUnverifiedFile = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');

  const rows = await readCsv(unverifiedFile);
  const stillRows = await readCsv(stillUnverifiedFile);

  const allHaier = [...rows, ...stillRows].filter(r => (r.Brand || '').toLowerCase().includes('haier'));

  console.log("==================================================");
  console.log("📊 BRAND 1 (HAIER) QUEUE BREAKDOWN");
  console.log("==================================================");
  console.log(`Total Haier Products Found: ${allHaier.length}`);
  allHaier.forEach((r, idx) => {
    console.log(`  [#${idx + 1}] Category: ${r.Category || 'N/A'} | Model: ${r.Model_Name}`);
  });
  console.log("==================================================\n");

  process.exit(0);
}

initBrandChunkPreview().catch(console.error);
