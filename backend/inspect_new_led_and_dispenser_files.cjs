const fs = require('fs');
const path = require('path');

function inspectNewLedAndDispenserFiles() {
  console.log("==================================================");
  console.log("🔍 INSPECTING IMAGE URLS IN LED UPLOADING & WATER DISPENSER FILES");
  console.log("==================================================");

  const folder = path.join(__dirname, 'all products files');
  const files = fs.readdirSync(folder);

  console.log("Files in folder:");
  files.forEach(f => {
    if (f.toLowerCase().includes('led') || f.toLowerCase().includes('dispenser')) {
      console.log(`   - ${f}`);
    }
  });

  const dispCsvPath = path.join(folder, 'PEL WATER DISPENSER OCT 2024.csv');
  if (fs.existsSync(dispCsvPath)) {
    const text = fs.readFileSync(dispCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());
    console.log("\n💧 PEL WATER DISPENSER OCT 2024.csv Sample:");
    lines.slice(0, 10).forEach(l => console.log(`   ${l}`));
  }

  console.log("==================================================");
}

inspectNewLedAndDispenserFiles();
