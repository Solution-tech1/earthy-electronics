const fs = require('fs');
const mysql = require('mysql2/promise');

async function restoreDatabase() {
  console.log("==================================================");
  console.log("🚀 RESTORING DATABASE TO M5 BACKUP (MINUS JUNK IMAGES)");
  console.log("==================================================");

  const backupData = JSON.parse(fs.readFileSync('./earthy_elec_products_backup_m5.json', 'utf8'));

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Clear existing products
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;'); await connection.query('TRUNCATE TABLE products'); await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log("✅ Cleared existing products table.");

  let restoredCount = 0;
  let validImageCount = 0;

  for (const p of backupData) {
    let finalImage = p.image;
    
    // Check for junk images (m1_ to m5_)
    if (finalImage && (finalImage.includes('m1_') || finalImage.includes('m2_') || finalImage.includes('m3_') || finalImage.includes('m4_') || finalImage.includes('m5_'))) {
        finalImage = 'NO_IMAGE_FOUND';
    }

    if (finalImage && finalImage !== 'NO_IMAGE_FOUND' && !finalImage.startsWith('/images/cat_')) {
        validImageCount++;
    }

    await connection.query(
      "INSERT INTO products (id, name, brand, category, price, discountPrice, image, description, specifications, stock, stock_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        p.id, 
        p.name, 
        p.brand, 
        p.category, 
        p.price, 
        p.discountPrice, 
        finalImage, 
        p.description, 
        JSON.stringify(p.specifications || {}), 
        p.stock, 
        p.stock_threshold, 
        p.created_at || new Date()
      ]
    );
    restoredCount++;
  }

  console.log(`✅ Restored ${restoredCount} total products.`);
  console.log(`✅ Included ${validImageCount} valid pristine images.`);
  console.log("==================================================");

  await connection.end();
}

restoreDatabase().catch(console.error);
