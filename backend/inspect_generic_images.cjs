const mysql = require('mysql2/promise');

async function inspectGenericImages() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const [products] = await db.query("SELECT id, name, category, image FROM products WHERE image LIKE '%cat_%' OR image LIKE '%product_%'");
  console.log(`Found ${products.length} products using fallback category images:`);
  products.forEach((p, i) => {
    console.log(`   [${i+1}] ID #${p.id} | ${p.name} | Img: "${p.image}"`);
  });

  await db.end();
  process.exit(0);
}

inspectGenericImages().catch(console.error);
