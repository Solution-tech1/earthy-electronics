const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

async function fixRemaining2HaierModels() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const productsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const itemsToFix = [
    {
      file: 'HW 100-BP14929-S3.png',
      name: 'Haier Front Load Washing Machine HWM 100-BP14929-S3',
      brand: 'Haier',
      category: 'Washing Machines',
      price: 135000,
      slug: 'haier-hwm-100-bp14929-s3'
    },
    {
      file: 'HW90-BP14959-S8.png',
      name: 'Haier 9KG Inverter Front Load Washing Machine HW90-BP14959-S8',
      brand: 'Haier',
      category: 'Washing Machines',
      price: 145000,
      slug: 'haier-hw90-bp14959-s8'
    }
  ];

  for (const item of itemsToFix) {
    const sourcePath = path.join(productsDir, item.file);
    const targetPath = path.join(targetImagesDir, `${item.slug}.png`);
    const relativeUrl = `/images/${item.slug}.png`;

    if (fs.existsSync(sourcePath)) {
      try {
        await sharp(sourcePath)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png({ quality: 95 })
          .toFile(targetPath);
      } catch (e) {
        fs.copyFileSync(sourcePath, targetPath);
      }

      const discountPrice = Math.round(item.price * 0.95);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.name,
          item.category,
          item.brand,
          item.price,
          discountPrice,
          relativeUrl,
          `Original genuine ${item.brand} ${item.name}. Official warranty, fast Karachi delivery.`,
          10
        ]
      );

      console.log(`✨ WHITENED & ADDED TO LIVE DB: [${item.brand}] ${item.name} -> ${relativeUrl}`);
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');
  console.log(`Total Live Products in MariaDB: ${stats[0].total}`);

  process.exit(0);
}

fixRemaining2HaierModels().catch(console.error);
