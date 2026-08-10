const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function insert40VerifiedProductsToDB() {
  console.log("==================================================");
  console.log("🚀 INSERTING 40 VERIFIED FRIEND BATCH PRODUCTS INTO MARIADB");
  console.log("==================================================");

  const reportPath = path.join(__dirname, 'matched_40_user_images_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error("Error: matched_40_user_images_report.json missing");
    return;
  }

  const items = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  console.log("✅ Connected to MariaDB database: earthy_elec");

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    if (item.status !== 'MATCHED_AND_VERIFIED') continue;

    const brand = item.brand;
    const model = item.model;
    const name = `${brand} ${model}`.trim();
    const category = item.category || 'General';
    const rateStr = (item.rate || '').replace(/[^0-9]/g, '');
    const price = rateStr ? parseInt(rateStr) : 45000;
    const discountPrice = Math.round(price * 0.94);
    const image = item.targetPath;
    const description = `Official ${brand} ${model} with full manufacturer warranty. Available for immediate delivery in Karachi.`;
    const stock = 15;
    const isNew = 1;
    const isFeatured = 1;

    // Check if product already exists in DB
    const [existing] = await connection.query("SELECT id FROM products WHERE name = ?", [name]);

    if (existing.length > 0) {
      await connection.query(
        "UPDATE products SET image = ?, price = ?, discountPrice = ?, category = ? WHERE id = ?",
        [image, price, discountPrice, category, existing[0].id]
      );
      updatedCount++;
      console.log(`🔄 Updated DB ID ${existing[0].id}: ${name}`);
    } else {
      const [res] = await connection.query(
        "INSERT INTO products (name, brand, category, price, discountPrice, image, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [name, brand, category, price, discountPrice, image, description, stock]
      );
      insertedCount++;
      console.log(`✅ Inserted DB ID ${res.insertId}: ${name}`);
    }
  }

  const [totalRes] = await connection.query("SELECT COUNT(*) as cnt FROM products");
  console.log("\n==================================================");
  console.log("🎉 DATABASE UPDATE COMPLETE");
  console.log("==================================================");
  console.log(`✅ Total Inserted: ${insertedCount}`);
  console.log(`🔄 Total Updated: ${updatedCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${totalRes[0].cnt}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

insert40VerifiedProductsToDB();
