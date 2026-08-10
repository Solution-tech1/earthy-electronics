const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function addUserUploadedDawlance() {
  const sourceImage = path.join(__dirname, 'product files', 'images.jfif');
  const targetImageDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  const targetImagePath = path.join(targetImageDir, 'dawlance_dw7200cfl.png');

  if (!fs.existsSync(targetImageDir)) {
    fs.mkdirSync(targetImageDir, { recursive: true });
  }

  // Copy uploaded image to frontend public directory
  fs.copyFileSync(sourceImage, targetImagePath);
  console.log(`✅ Image copied to: ${targetImagePath}`);

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const relativeUrl = '/images/dawlance_dw7200cfl.png';
  const name = 'Dawlance DW-7200 CFL Single Tub Washing Machine';
  const brand = 'Dawlance';
  const category = 'Washing Machines';
  const price = 38000;
  const discountPrice = 36100;

  // Insert into MariaDB
  await db.execute(
    `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      category,
      brand,
      price,
      discountPrice,
      relativeUrl,
      `Original genuine ${name}. Official warranty, fast Karachi delivery, and installation support.`,
      10
    ]
  );

  console.log(`✅ Inserted into MariaDB: ${name} (${relativeUrl})`);

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');
  console.log(`\n==================================================`);
  console.log(`🎉 PRODUCT SUCCESSFULLY ADDED TO LIVE SITE!`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log(`==================================================\n`);

  process.exit(0);
}

addUserUploadedDawlance().catch(console.error);
