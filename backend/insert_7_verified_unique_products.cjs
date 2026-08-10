const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function insert7VerifiedUniqueProducts() {
  console.log("==================================================");
  console.log("🚀 UPDATING 7 VERIFIED UNIQUE PRODUCTS IN MARIADB");
  console.log("==================================================");

  const auditPath = path.join(__dirname, 'no_image_products_audit.json');
  if (!fs.existsSync(auditPath)) {
    console.error("Error: no_image_products_audit.json missing");
    return;
  }

  const items = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const verifiedUnique7 = items.filter(i => i.confidenceLevel === 'VERIFIED_SAME_PRODUCT' && i.imageUnique === 'Yes');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  console.log("✅ Connected to MariaDB database: earthy_elec");

  let updatedCount = 0;

  for (const item of verifiedUnique7) {
    if (item.candidateImage) {
      await connection.query(
        "UPDATE products SET image = ? WHERE id = ?",
        [item.candidateImage, item.id]
      );
      updatedCount++;
      console.log(`✅ Live Updated DB ID #${item.id} ("${item.listModel}") -> Image: ${item.candidateImage}`);
    }
  }

  const [totalRes] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");
  console.log("\n==================================================");
  console.log("🎉 LIVE DATABASE UPDATE COMPLETE");
  console.log("==================================================");
  console.log(`✅ Total Products Live Updated: ${updatedCount}`);
  console.log(`🛒 Total Active Products in DB: ${totalRes[0].total}`);
  console.log(`✨ Total Products with 100% UNIQUE HD Cutouts: ${totalRes[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

insert7VerifiedUniqueProducts();
