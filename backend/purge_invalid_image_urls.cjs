const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    
    // Test if dummy generated pattern
    if (url.match(/-\d{4}[a-z]-500x500/i) || url.match(/-\d{4}\d+-500x500/i)) {
      return resolve(false);
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function purgeInvalidImageUrls() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🔍 CHECKING HTTP VALIDITY OF ALL IMAGE URLS IN MARIADB...");

  const [products] = await db.query('SELECT id, name, brand, image FROM products');
  let deletedCount = 0;

  for (const p of products) {
    const isValid = await checkUrl(p.image);
    if (!isValid) {
      console.log(`❌ Removing Product ID #${p.id}: [${p.brand}] ${p.name} (Broken/Dummy Image: ${p.image})`);
      await db.query('DELETE FROM products WHERE id = ?', [p.id]);
      deletedCount++;
    }
  }

  const [res] = await db.query('SELECT count(*) as total FROM products');

  console.log("\n==================================================");
  console.log("✅ INVALID IMAGE PURGE COMPLETED!");
  console.log(`• Total Broken/Dummy Products Removed: ${deletedCount}`);
  console.log(`• Final Live Products in MariaDB with 100% Real Working Images: ${res[0].total}`);
  console.log("==================================================\n");

  process.exit(0);
}

purgeInvalidImageUrls().catch(console.error);
