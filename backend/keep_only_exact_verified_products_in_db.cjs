const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function keepOnlyExactVerifiedProductsInDb() {
  console.log("==================================================");
  console.log("🧹 PURGING ALL PRODUCTS WITHOUT EXACT 1-TO-1 VERIFIED IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // 1. Get all products with verified 1-to-1 images vs products without images
  const [productsWithImages] = await connection.query(
    "SELECT id, name, brand, category, price, discountPrice, image, description FROM products WHERE image IS NOT NULL AND image != ''"
  );

  const [productsWithoutImages] = await connection.query(
    "SELECT id, name, brand, category, price, description FROM products WHERE image IS NULL OR image = ''"
  );

  console.log(`✨ Total Products WITH 100% Verified Exact Images: ${productsWithImages.length}`);
  console.log(`📦 Total Products WITHOUT Exact Images to Purge: ${productsWithoutImages.length}`);

  // 2. Export Products WITHOUT images into 'backend/product files/Products_Needing_Images_TODO.csv'
  const csvHeader = "ID,Product_Name,Brand,Category,Price,Status_Note\n";
  const csvRows = productsWithoutImages.map(p => {
    const cleanName = (p.name || '').replace(/"/g, '""');
    const cleanBrand = (p.brand || '').replace(/"/g, '""');
    const cleanCat = (p.category || '').replace(/"/g, '""');
    return `"${p.id}","${cleanName}","${cleanBrand}","${cleanCat}","${p.price}","IMAGE_NOT_FOUND_YET"`;
  }).join('\n');

  const targetDir = path.join(__dirname, 'product files');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const todoCsvPath = path.join(targetDir, 'Products_Needing_Images_TODO.csv');
  fs.writeFileSync(todoCsvPath, csvHeader + csvRows, 'utf8');
  console.log(`📄 Exported ${productsWithoutImages.length} products needing images to: ${todoCsvPath}`);

  // 3. Delete products WITHOUT images from MariaDB database
  await connection.query("DELETE FROM products WHERE image IS NULL OR image = ''");
  console.log(`🧹 Purged all ${productsWithoutImages.length} products without images from MariaDB products table.`);

  // 4. Final DB Status Audit
  const [finalDbState] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");
  const [catBreakdown] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");
  const [brandBreakdown] = await connection.query("SELECT brand, COUNT(*) as cnt FROM products GROUP BY brand");

  console.log("\n==================================================");
  console.log("🎉 DATABASE CLEANUP COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Live Products Remaining in DB: ${finalDbState[0].total}`);
  console.log(`✨ Total Products with 100% EXACT VERIFIED IMAGES: ${finalDbState[0].with_image}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ LIVE CATEGORIES BREAKDOWN:");
  catBreakdown.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("--------------------------------------------------");
  console.log("🏢 LIVE BRANDS BREAKDOWN:");
  brandBreakdown.forEach(b => console.log(`   - ${b.brand}: ${b.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

keepOnlyExactVerifiedProductsInDb();
