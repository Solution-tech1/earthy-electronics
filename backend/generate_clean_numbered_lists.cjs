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

async function generateCleanNumberedLists() {
  const file73Path = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');
  const file216Path = path.join(__dirname, 'product files', 'Still_Unmatched.csv');

  const rows73 = await readCsv(file73Path);
  const rows216 = await readCsv(file216Path);

  let text73 = "### 📋 LIST 1: 73 CDN UNVERIFIED PRODUCTS\n\n";
  text73 += "| S.No | Brand | Category | Model Name |\n|---|---|---|---|\n";
  rows73.forEach((r, idx) => {
    text73 += `| ${idx + 1} | ${r.Brand || 'Generic'} | ${r.Category || 'Appliance'} | ${r.Model_Name || ''} |\n`;
  });

  let text216 = "\n\n### 📋 LIST 2: 216 UNMATCHED / DISCONTINUED PRODUCTS\n\n";
  text216 += "| S.No | Brand | Category | Model Name |\n|---|---|---|---|\n";
  rows216.forEach((r, idx) => {
    text216 += `| ${idx + 1} | ${r.Brand || 'Generic'} | ${r.Category || 'Appliance'} | ${r.Model_Name || ''} |\n`;
  });

  fs.writeFileSync(path.join(__dirname, 'Formatted_73_and_216_Lists.md'), text73 + text216, 'utf8');

  console.log(`Generated Formatted_73_and_216_Lists.md (${rows73.length} items in List 1, ${rows216.length} items in List 2)`);
  process.exit(0);
}

generateCleanNumberedLists().catch(console.error);
