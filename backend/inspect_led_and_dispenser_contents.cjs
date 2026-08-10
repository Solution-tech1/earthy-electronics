const fs = require('fs');
const path = require('path');

function inspectLedAndDispenserContents() {
  console.log("==================================================");
  console.log("📄 LED & WATER DISPENSER FILES CONTENTS INSPECTION");
  console.log("==================================================");

  const folder = path.join(__dirname, 'all products files');
  const ledCsvPath = path.join(folder, 'ALL LEDs ALFA.csv');
  const dispCsvPath = path.join(folder, 'PEL WATER DISPENSER OCT 2024.csv');

  if (fs.existsSync(ledCsvPath)) {
    const text = fs.readFileSync(ledCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());
    console.log(`\n📺 ALL LEDs ALFA.csv (${lines.length} lines):`);
    lines.slice(0, 10).forEach((l, idx) => console.log(`   Line ${idx + 1}: ${l.substring(0, 120)}`));
  }

  if (fs.existsSync(dispCsvPath)) {
    const text = fs.readFileSync(dispCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());
    console.log(`\n💧 PEL WATER DISPENSER OCT 2024.csv (${lines.length} lines):`);
    lines.slice(0, 10).forEach((l, idx) => console.log(`   Line ${idx + 1}: ${l.substring(0, 120)}`));
  }

  console.log("==================================================");
}

inspectLedAndDispenserContents();
