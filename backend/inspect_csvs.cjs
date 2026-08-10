const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const baseDir = path.join(__dirname, 'all products files');

const csvFiles = [
  "ALL LEDs ALFA.csv",
  "ALL W-D ALFA.csv",
  "PEL WATER DISPENSER OCT 2024.csv",
  "AC .csv.csv",
  "Microwave.csv.csv",
  "W-M ALFA.csv"
];

async function inspectCsvs() {
  console.log("==================================================");
  console.log("📊 INSPECTING CSV FILES IN 'all products files'");
  console.log("==================================================");

  for (const fname of csvFiles) {
    const fpath = path.join(baseDir, fname);
    if (fs.existsSync(fpath)) {
      const rows = [];
      await new Promise(resolve => {
        fs.createReadStream(fpath)
          .pipe(csv())
          .on('data', d => rows.push(d))
          .on('end', resolve);
      });

      console.log(`\n📄 CSV: ${fname}`);
      console.log(`   Row Count: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`   Columns: ${Object.keys(rows[0]).join(', ')}`);
        console.log("   Sample Rows (First 3):");
        rows.slice(0, 3).forEach((r, i) => {
          console.log(`     Row ${i+1}:`, JSON.stringify(r));
        });
      }
    }
  }

  console.log("\n==================================================");
}

inspectCsvs().catch(console.error);
