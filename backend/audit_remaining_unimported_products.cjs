const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function auditRemainingUnimportedProducts() {
  console.log("==================================================");
  console.log("🔍 AUDITING REMAINING UNIMPORTED PRODUCTS ACROSS ALL FILES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [dbProducts] = await connection.query("SELECT name FROM products");
  const dbNamesSet = new Set(dbProducts.map(p => p.name.toLowerCase().replace(/\s+/g, ' ').trim()));

  console.log(`🛒 Current Total Live Products in Database: ${dbNamesSet.size}`);

  const folder = path.join(__dirname, 'all products files');
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.csv') || f.endsWith('.csv.csv') || f.endsWith('.xlsx'));

  let totalFileRows = 0;
  const unimportedItems = [];

  for (const file of files) {
    if (file.endsWith('.xlsx')) continue; // CSV files parsed

    const filePath = path.join(folder, file);
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length < 2) continue;

    let fileUnimported = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map(s => s.replace(/"/g, '').trim());
      let title = parts[1] || parts[0] || parts[3];

      if (!title || title.length < 4 || title.toUpperCase().includes('TOTAL') || title.toUpperCase().includes('PRODUCT UPLOADED') || title.toUpperCase().includes('MODEL IN LIST')) {
        continue;
      }

      totalFileRows++;
      const normTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!dbNamesSet.has(normTitle)) {
        fileUnimported++;
        unimportedItems.push({ file: file, title: title });
      }
    }
  }

  console.log("\n==================================================");
  console.log("📊 AUDIT SUMMARY REPORT");
  console.log("==================================================");
  console.log(`🛒 Total Live Products Currently Active in DB: ${dbNamesSet.size}`);
  console.log(`📄 Total Valid Product Rows in Catalog Files: ${totalFileRows}`);
  console.log(`📦 Remaining Products NOT YET Added to Site: ${unimportedItems.length}`);
  console.log("==================================================\n");

  if (unimportedItems.length > 0) {
    console.log("Sample Remaining Unimported Products:");
    unimportedItems.slice(0, 10).forEach((item, idx) => {
      console.log(`   ${idx + 1}. [File: ${item.file}] ${item.title}`);
    });
  }

  await connection.end();
  process.exit(0);
}

auditRemainingUnimportedProducts();
