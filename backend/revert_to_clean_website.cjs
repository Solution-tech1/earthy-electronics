const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function revertToCleanWebsite() {
  console.log("==================================================");
  console.log("🔄 REVERTING WEBSITE TO CLEAN ORIGINAL PRODUCT IMAGES");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand FROM products');

  let updatedCount = 0;

  for (const p of products) {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const brand = (p.brand || '').toLowerCase();

    let targetImg = '/images/cat_washer.png';

    if (cat.includes('air') || cat.includes('ac')) {
      targetImg = '/images/cat_ac.png';
    } else if (cat.includes('refrigerat') || cat.includes('fridge')) {
      targetImg = '/images/cat_fridge.png';
    } else if (cat.includes('wash')) {
      targetImg = '/images/cat_washer.png';
    } else if (cat.includes('freez')) {
      targetImg = '/images/product_freezer.png';
    } else if (cat.includes('dispenser')) {
      targetImg = '/images/product_dispenser.png';
    } else if (cat.includes('tv') || cat.includes('led')) {
      targetImg = '/images/cat_tv.png';
    } else if (cat.includes('microwave') || cat.includes('oven')) {
      targetImg = '/images/cat_microwave.png';
    }

    await db.execute('UPDATE products SET image = ? WHERE id = ?', [targetImg, p.id]);
    updatedCount++;
  }

  console.log(`✅ Restored clean original product images across all ${products.length} products!`);
  await db.end();
  process.exit(0);
}

revertToCleanWebsite().catch(console.error);
