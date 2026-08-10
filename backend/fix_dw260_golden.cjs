const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

async function fixDW260Golden() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const sourceFile = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products', 'DW-260 LVS goden.png.jpg');
  const targetFile = path.join(__dirname, '..', 'frontend', 'public', 'images', 'dawlance-dw-260-lvs-golden.png');
  const relativeUrl = '/images/dawlance-dw-260-lvs-golden.png';

  if (fs.existsSync(sourceFile)) {
    await sharp(sourceFile)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 95 })
      .toFile(targetFile);

    const name = 'Dawlance DW-260 LVS Golden Washing Machine';
    const category = 'Washing Machines';
    const brand = 'Dawlance';
    const price = 48000;
    const discountPrice = 45600;

    await db.execute(
      `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, brand, price, discountPrice, relativeUrl, `Original genuine Dawlance DW-260 LVS Golden. Official warranty.`, 10]
    );

    console.log(`✅ ADDED DW-260 LVS GOLDEN TO MariaDB: ${relativeUrl}`);
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');
  console.log(`Total Live Products in MariaDB: ${stats[0].total}`);

  process.exit(0);
}

fixDW260Golden().catch(console.error);
