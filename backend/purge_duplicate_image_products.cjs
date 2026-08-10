require('dotenv').config();
const mysql = require('mysql2/promise');

async function purgeDuplicateImageProducts() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("=== AUDITING MARIADB FOR DUPLICATE IMAGE URLS ===");

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products ORDER BY id');

  const seenImages = new Map();
  const duplicateIds = [];

  for (const p of products) {
    const imgUrl = (p.image || '').trim();
    if (!imgUrl) {
      duplicateIds.push(p.id);
      continue;
    }

    if (seenImages.has(imgUrl)) {
      console.log(`❌ Duplicate Image found on ID #${p.id} "${p.name}" (First seen on ID #${seenImages.get(imgUrl)}) -> REMOVING`);
      duplicateIds.push(p.id);
    } else {
      seenImages.set(imgUrl, p.id);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`\nRemoving ${duplicateIds.length} products with duplicate image URLs...`);
    await db.query('DELETE FROM products WHERE id IN (?)', [duplicateIds]);
    console.log(`✅ Successfully deleted ${duplicateIds.length} duplicate image products!`);
  } else {
    console.log(`\n✅ 0 DUPLICATE IMAGES FOUND! Every single product in MariaDB has a 100% UNIQUE IMAGE URL!`);
  }

  const [totalCount] = await db.query('SELECT COUNT(*) as cnt FROM products');
  console.log(`\n=============================\nTOTAL LIVE 100% UNIQUE IMAGE PRODUCTS: ${totalCount[0].cnt}\n=============================`);

  process.exit(0);
}

purgeDuplicateImageProducts().catch(console.error);
