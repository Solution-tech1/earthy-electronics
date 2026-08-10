const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function cleanUnmatchedRemoveGenerics() {
  const unmatchedFile = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
  const rows = [];

  if (fs.existsSync(unmatchedFile)) {
    await new Promise((resolve) => {
      fs.createReadStream(unmatchedFile)
        .pipe(csv())
        .on('data', (d) => rows.push(d))
        .on('end', resolve);
    });
  }

  const cleanProperRows = rows.filter(r => {
    const model = (r.Model_Name || '').trim().toUpperCase();
    const hasDigits = /\d/.test(model);
    const hasModelCode = /-[A-Z0-9]/i.test(model);
    const isGenericWord = ['HAIER', 'PEL', 'GREE', 'DAWLANCE', 'TCL', 'KENWOOD', 'ECOSTAR', 'ORIENT', 'WESTPOINT', 'SAMSUNG', 'HOMAGE', 'ROYAL', 'SUPER ASIA', 'SUPERASIA', 'WASHER', 'SPIN DRYER', 'WASH & SPIN', 'AC', 'AIR CONDITIONER', 'MICROWAVE', 'WATER DISPENSER', 'FRONT LOAD WASHING MACHINE', 'HAIER AUTOMATIC', 'DAWLANCE AUTO', 'ROYAL WASHING MACHINE', 'HOMAGE WASHING MACHINE'].includes(model);

    return (hasDigits || hasModelCode) && !isGenericWord && model.length > 3;
  });

  const removedCount = rows.length - cleanProperRows.length;

  // Rewrite Unmatched_Products.csv with ONLY proper model products!
  let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Reason_Unmatched\n';
  let body = cleanProperRows.map((r, idx) => {
    return `"${idx + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${(r.Reason_Unmatched || 'No exact model match on official brand portal').replace(/"/g, '""')}"`;
  }).join('\n');

  fs.writeFileSync(unmatchedFile, header + body, 'utf8');

  console.log("==================================================");
  console.log("✅ UNMATCHED FILE GENERIC PURGE COMPLETED!");
  console.log(`• Generic Missing Model Items Removed: ${removedCount}`);
  console.log(`• Total Clean Proper Model Products Remaining in Queue: ${cleanProperRows.length}`);
  console.log("==================================================\n");

  process.exit(0);
}

cleanUnmatchedRemoveGenerics().catch(console.error);
