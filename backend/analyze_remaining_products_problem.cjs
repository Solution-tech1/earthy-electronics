const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

async function analyzeRemainingProductsProblem() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [liveStats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  const manualReviewFile = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
  const stillUnmatchedFile = path.join(__dirname, 'product files', 'Still_Unmatched.csv');
  const unmatchedCsvPath = path.join(__dirname, 'product files', 'Unmatched_Products.csv');

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

  const manualRows = await readCsv(manualReviewFile);
  const stillUnmatchedRows = await readCsv(stillUnmatchedFile);
  const unmatchedRows = await readCsv(unmatchedCsvPath);

  console.log("==================================================");
  console.log("📊 PROJECT REMAINING PRODUCTS COMPLETE DIAGNOSTIC");
  console.log("==================================================");
  console.log(`✅ Total Live Site Products (MariaDB): ${liveStats[0].total}`);
  console.log(`⚠️ Total Partial Match (Needs Manual Review): ${manualRows.length}`);
  console.log(`❌ Total Still Unmatched (Not Found on Official Portals): ${stillUnmatchedRows.length}`);
  console.log(`📋 Total Unmatched Working Queue Remaining: ${unmatchedRows.length}`);
  console.log("==================================================\n");

  process.exit(0);
}

analyzeRemainingProductsProblem().catch(console.error);
