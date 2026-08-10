const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');
const http = require('http');
const mysql = require('mysql2/promise');

function fetchHtml(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve('');
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 3500 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function recheckFatherStoreList() {
  console.log("==================================================");
  console.log("🔍 RECHECKING FATHER'S REAL STORE PRODUCT LIST...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const manualFile = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
  const rows = [];

  if (fs.existsSync(manualFile)) {
    await new Promise(resolve => {
      fs.createReadStream(manualFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  console.log(`Auditing ${rows.length} products from Needs_Manual_Review.csv...`);

  let recoveredCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const model = r.Model_Name || '';
    const brand = r.Brand || '';

    // Test real CDN search on ishopping.pk
    const query = encodeURIComponent(`${brand} ${model}`);
    const searchUrl = `https://www.ishopping.pk/catalogsearch/result/?q=${query}`;
    const html = await fetchHtml(searchUrl);

    // Extract image URL from html
    const imgMatches = html.match(/https:\/\/[^"']+\.(?:jpg|png|jpeg|webp)/gi) || [];
    let validFound = '';

    for (const imgUrl of imgMatches) {
      if (imgUrl.includes('catalog/product') && !usedImages.has(imgUrl)) {
        const ok = await checkUrl(imgUrl);
        if (ok) {
          validFound = imgUrl;
          break;
        }
      }
    }

    if (validFound) {
      recoveredCount++;
      usedImages.add(validFound);
      console.log(`✅ RECOVERED EXACT IMAGE [#${i+1}]: [${brand}] ${model} -> ${validFound}`);

      const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 28000;
      const discountPrice = Math.round(priceNum * 0.95);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          model,
          r.Category || 'Home Appliances',
          brand,
          priceNum,
          discountPrice,
          validFound,
          `Original genuine ${brand} ${model}. Official warranty, fast Karachi delivery.`,
          10
        ]
      );
    }
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 RECHECK COMPLETE!");
  console.log(`• Recovered & Added Products: ${recoveredCount}`);
  console.log(`• Final Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Final Unique Images in MariaDB: ${res[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

recheckFatherStoreList().catch(console.error);
