const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function inspectLedAndDispenserFiles() {
  console.log("==================================================");
  console.log("🔍 INSPECTING LED & WATER DISPENSER FILES & DB STATUS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [ledDb] = await connection.query("SELECT COUNT(*) as cnt FROM products WHERE category LIKE '%led%' OR category LIKE '%tv%' OR name LIKE '%led%' OR name LIKE '%tv%'");
  const [dispDb] = await connection.query("SELECT COUNT(*) as cnt FROM products WHERE category LIKE '%dispenser%' OR name LIKE '%dispenser%'");

  console.log(`🛒 LED / TV Products currently in DB: ${ledDb[0].cnt}`);
  console.log(`🛒 Water Dispenser Products currently in DB: ${dispDb[0].cnt}`);

  const folderPath = path.join(__dirname, 'all products files');
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    console.log("\n📁 Files found in 'all products files':");
    files.filter(f => f.toLowerCase().includes('led') || f.toLowerCase().includes('dispenser')).forEach(f => {
      console.log(`   - ${f} (${fs.statSync(path.join(folderPath, f)).size} bytes)`);
    });
  }

  await connection.end();
  process.exit(0);
}

inspectLedAndDispenserFiles();
