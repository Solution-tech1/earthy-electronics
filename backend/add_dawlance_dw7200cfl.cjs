const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

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

async function addDawlanceDW7200() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const dw7200Img = 'https://subhanelectronics.pk/wp-content/uploads/2023/05/DW-7200-CFL.jpg';
  const isOk = await checkUrl(dw7200Img);

  if (isOk) {
    await db.execute(
      `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Dawlance DW-7200 CFL Single Tub Washing Machine',
        'Washing Machines',
        'Dawlance',
        38000,
        36100,
        dw7200Img,
        'Original genuine Dawlance DW-7200 CFL Single Tub Washing Machine. Official warranty, fast Karachi delivery.',
        10
      ]
    );
    console.log(`✅ ADDED DAWLANCE DW-7200 CFL TO MariaDB: ${dw7200Img}`);
  } else {
    console.log(`⚠️ Image 404: ${dw7200Img}`);
  }

  const [stats] = await db.query('SELECT count(*) as total FROM products');
  console.log(`Total Live Products in MariaDB: ${stats[0].total}`);

  process.exit(0);
}

addDawlanceDW7200().catch(console.error);
