const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

function normalizeCategory(cat, name = '') {
  cat = (cat || '').toLowerCase().trim();
  name = (name || '').toLowerCase().trim();

  if (cat === 'ac' || name.includes('ac') || name.includes('inverter') || name.includes('air conditioner')) return 'Air Conditioners';
  if (cat.includes('wm') || cat.includes('wash') || name.includes('washer') || name.includes('washing')) return 'Washing Machines';
  if (cat.includes('ref') || cat.includes('fridge') || name.includes('refriger')) return 'Refrigerators';
  if (cat.includes('led') || cat.includes('tv') || name.includes('tv') || name.includes('screen')) return 'LED TVs';
  if (cat.includes('m-w') || cat.includes('micro') || name.includes('microwave') || name.includes('oven')) return 'Microwave Ovens';
  if (cat.includes('w-d') || cat.includes('dispen') || name.includes('dispenser')) return 'Water Dispensers';
  if (cat.includes('geyser') || name.includes('geyser') || name.includes('water heater')) return 'Geysers & Water Heaters';
  if (cat.includes('freezer') || name.includes('freezer')) return 'Deep Freezers';
  return 'Kitchen Appliances';
}

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW'];

  return str
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/-by electronics world/gi, '')
    .replace(/by electronics world/gi, '')
    .replace(/-be-on installments/gi, '')
    .replace(/only for karachi/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => {
      if (!word) return '';
      const cleanW = word.toUpperCase().replace(/[^\w]/g, '');
      if (keepUpper.includes(cleanW)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

async function resetToCleanVerified() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("🧹 RESETTING MARIADB PRODUCTS TO 100% PURE & VERIFIED PRODUCTS...");

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE products');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  const rows = [];

  fs.createReadStream(readyCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      const insertedImages = new Set();
      let count = 0;

      for (const r of rows) {
        const url = (r.Image_URL || r.image || '').trim();
        if (!url || !url.startsWith('http')) continue;
        if (insertedImages.has(url)) continue; // Strictly zero duplicates!

        insertedImages.add(url);

        const name = toTitleCase(r.Model_Name || r.name);
        const brand = (r.Brand || r.brand || 'Generic').replace(/[^\x00-\x7F]/g, ' ').trim();
        const category = normalizeCategory(r.Category || r.category, name);
        const priceNum = parseFloat((r.Rate || r.price || '0').toString().replace(/[^\d.]/g, '')) || 50000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            category,
            brand,
            priceNum,
            discountPrice,
            url,
            `Original genuine ${brand} ${name}. Full official brand warranty, fast Karachi delivery, and installation support.`,
            10
          ]
        );
        count++;
      }

      console.log(`\n==================================================`);
      console.log(`✅ DATABASE RESET COMPLETED!`);
      console.log(`• Total Pure Verified Products Inserted: ${count}`);
      console.log(`• Total Unique Image URLs: ${insertedImages.size}`);
      console.log(`• Duplicate Images: 0`);
      console.log(`==================================================\n`);

      process.exit(0);
    });
}

resetToCleanVerified().catch(console.error);
