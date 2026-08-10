const mysql = require('mysql2/promise');

async function auditDuplicates() {
  console.log("==================================================");
  console.log("🔍 AUDITING DUPLICATE IMAGES FOR DISPENSERS AND WASHING MACHINES");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [rows] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE category LIKE '%dispenser%' OR category LIKE '%washing%' OR category LIKE '%washer%'`
  );

  console.log(`Total Dispenser & Washing Machine Products: ${rows.length}\n`);

  const imageMap = {};
  rows.forEach(r => {
    if (!imageMap[r.image]) imageMap[r.image] = [];
    imageMap[r.image].push(r);
  });

  console.log("Shared Image Clusters:");
  Object.keys(imageMap).forEach(imgPath => {
    if (imageMap[imgPath].length > 1) {
      console.log(`\n📸 Image Path: "${imgPath}" shared by ${imageMap[imgPath].length} products:`);
      imageMap[imgPath].forEach(p => console.log(`   - [ID: ${p.id}] ${p.brand} | ${p.name}`));
    }
  });

  await db.end();
}

auditDuplicates().catch(console.error);
