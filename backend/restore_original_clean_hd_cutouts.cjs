const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function restoreOriginalCleanHdCutouts() {
  console.log("==================================================");
  console.log("✨ RESTORING ORIGINAL CRYSTAL-CLEAR HD PRODUCT CUTOUTS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const sourceFolder = path.join(__dirname, 'all products files', 'products');
  const targetFolder = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  if (!fs.existsSync(sourceFolder)) {
    console.log("Source folder not found:", sourceFolder);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceFolder);
  console.log(`📦 Found ${files.length} original HD files in 'all products files/products/'. Copying to public images...`);

  let copiedCount = 0;

  files.forEach(f => {
    const srcPath = path.join(sourceFolder, f);
    const destPath = path.join(targetFolder, f);
    fs.copyFileSync(srcPath, destPath);
    copiedCount++;
  });

  console.log(`✅ Copied ${copiedCount} pristine HD image files to frontend/public/images/products/`);

  // Update DB products with original crystal-clear HD image paths
  const [products] = await connection.query("SELECT id, name, brand, category FROM products");
  const targetFiles = fs.readdirSync(targetFolder);

  let updatedCount = 0;

  for (const p of products) {
    const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanBrand = p.brand.toLowerCase().replace(/[^a-z0-9]/g, '');

    const matchedFile = targetFiles.find(f => {
      const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanF.includes(cleanName) || cleanName.includes(cleanF);
    });

    if (matchedFile) {
      const imgPath = `/images/products/${matchedFile}`;
      await connection.query("UPDATE products SET image = ? WHERE id = ?", [imgPath, p.id]);
      updatedCount++;
    }
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 ORIGINAL HD IMAGES RESTORED SUCCESSFULLY");
  console.log("==================================================");
  console.log(`✨ Total Products Updated with Pristine HD Images: ${updatedCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${finalDbState[0].total}`);
  console.log(`📸 Products with Active Images: ${finalDbState[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

restoreOriginalCleanHdCutouts();
