const mysql = require('mysql2/promise');

async function findEmptyImageColumns() {
  console.log("==================================================");
  console.log("🔍 CHECKING FOR PRODUCTS WITH EMPTY IMAGE STRINGS IN DATABASE");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const [products] = await db.query("SELECT id, name, category, brand, image FROM products WHERE image IS NULL OR TRIM(image) = '' OR image = 'null'");

  console.log(`Found ${products.length} products with empty image string in database:`);
  products.forEach((p, i) => {
    console.log(`   [${i+1}] ID #${p.id} | ${p.name} | Cat: ${p.category} | Brand: ${p.brand}`);
  });

  if (products.length > 0) {
    console.log("\nFixing these products with clean brand/category cutout image paths...");
    for (const p of products) {
      const cat = (p.category || '').toLowerCase();
      let newImg = '/images/cat_washer.png';

      if (cat.includes('air') || cat.includes('ac')) {
        newImg = '/images/cat_ac.png';
      } else if (cat.includes('refrigerat') || cat.includes('fridge')) {
        newImg = '/images/cat_fridge.png';
      } else if (cat.includes('wash')) {
        newImg = '/images/cat_washer.png';
      } else if (cat.includes('freez')) {
        newImg = '/images/product_freezer.png';
      } else if (cat.includes('dispenser')) {
        newImg = '/images/product_dispenser.png';
      } else if (cat.includes('tv') || cat.includes('led')) {
        newImg = '/images/cat_tv.png';
      } else if (cat.includes('microwave') || cat.includes('oven')) {
        newImg = '/images/cat_microwave.png';
      }

      await db.execute('UPDATE products SET image = ? WHERE id = ?', [newImg, p.id]);
    }
    console.log(`✅ Fixed all ${products.length} empty image records!`);
  }

  await db.end();
  process.exit(0);
}

findEmptyImageColumns().catch(console.error);
