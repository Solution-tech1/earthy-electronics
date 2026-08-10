const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function verifyEcostarHttpStatus() {
  console.log("==================================================");
  console.log("🔍 TESTING REAL-TIME HTTP STATUS FOR ECOSTAR IMAGES...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [rows] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE LOWER(brand) LIKE '%ecostar%' OR LOWER(name) LIKE '%ecostar%'`
  );

  const brokenIds = [];

  for (const r of rows) {
    const isOk = await checkUrl(r.image);
    if (!isOk) {
      brokenIds.push(r.id);
      console.log(`❌ BROKEN 404 IMAGE FOUND [#${r.id}]: ${r.name} -> ${r.image}`);
    } else {
      console.log(`✅ 200 OK VALID [#${r.id}]: ${r.name}`);
    }
  }

  if (brokenIds.length > 0) {
    console.log(`\nPurging ${brokenIds.length} broken 404 EcoStar image rows from DB...`);
    await db.query(`DELETE FROM products WHERE id IN (?)`, [brokenIds]);
  } else {
    console.log("\nAll EcoStar image URLs load cleanly with HTTP 200 OK!");
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("✅ ECOSTAR HTTP VERIFICATION COMPLETE!");
  console.log(`• Broken Images Purged: ${brokenIds.length}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

verifyEcostarHttpStatus().catch(console.error);
