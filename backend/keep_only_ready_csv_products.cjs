require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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

async function keepOnlyReadyCsvProducts() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("=== RESETTING MARIADB TO EXCLUSIVELY READY PRODUCTS WITH IMAGES ===");

  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE products');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log("🧹 Truncated all products from MariaDB!");

  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  const results = [];

  fs.createReadStream(readyCsvPath)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      let inserted = 0;
      for (const row of results) {
        const brand = (row.Brand || 'Generic').replace(/[^\x00-\x7F]/g, ' ').trim();
        const rawName = (row.Model_Name || row.Name || '').replace(/[^\x00-\x7F]/g, ' ').trim();
        if (!rawName) continue;

        const name = toTitleCase(rawName);
        const category = normalizeCategory(row.Category, name);
        const priceNum = parseFloat((row.Price || '0').toString().replace(/[^\d.]/g, '')) || 50000;
        const discountPrice = Math.round(priceNum * 0.95);
        const imageUrl = (row.Image_URL || '').replace(/[^\x00-\x7F]/g, '').trim();

        if (!imageUrl || imageUrl.startsWith('data:image')) continue;

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            category,
            brand,
            priceNum,
            discountPrice,
            imageUrl,
            `Original genuine ${brand} ${name}. Full official brand warranty, fast Karachi delivery, and installation support.`,
            15
          ]
        );
        inserted++;
      }

      console.log(`\n✅ Successfully reset database to EXCLUSIVELY ${inserted} READY PRODUCTS WITH IMAGES!`);

      // Count remaining TODO products
      const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
      const todoRows = [];

      fs.createReadStream(todoCsvPath)
        .pipe(csv())
        .on('data', (row) => todoRows.push(row))
        .on('end', async () => {
          console.log(`\n==================================================`);
          console.log(`📊 FINAL EXACT AUDIT REPORT`);
          console.log(`==================================================`);
          console.log(`• Live Products in Site (Products_WITH_Images_READY.csv): ${inserted}`);
          console.log(`• REMAINING Products Needing Images (Products_NEEDING_Images_TODO.csv): ${todoRows.length}`);
          console.log(`==================================================\n`);

          process.exit(0);
        });
    });
}

keepOnlyReadyCsvProducts().catch(console.error);
