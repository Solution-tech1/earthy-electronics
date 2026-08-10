const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'WF', 'HW', 'HWD'];

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

async function insertManualReviewToDB() {
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

  let insertedCount = 0;
  let skippedCount = 0;

  for (const r of rows) {
    const url = (r.Image_URL || '').trim();
    if (!url || usedImages.has(url)) {
      skippedCount++;
      continue;
    }

    const isValid = await checkUrl(url);
    if (!isValid) {
      console.log(`⚠️ Image URL 404 skipped: ${url}`);
      skippedCount++;
      continue;
    }

    usedImages.add(url);
    insertedCount++;

    const name = toTitleCase(r.Model_Name);
    const brand = r.Brand || 'Generic';
    const category = normalizeCategory(r.Category, name);
    const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 25000;
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
        `Original genuine ${brand} ${name}. Official ${brand} warranty, fast Karachi delivery, and installation support.`,
        10
      ]
    );
  }

  const [res] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("==================================================");
  console.log("✅ MANUAL REVIEW PRODUCTS LIVE INSERTION COMPLETED!");
  console.log(`• Successfully Inserted Products: ${insertedCount}`);
  console.log(`• Skipped (Duplicate / 404 URLs): ${skippedCount}`);
  console.log(`• Final Live Products in MariaDB: ${res[0].total}`);
  console.log(`• Final Unique Images in MariaDB: ${res[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

insertManualReviewToDB().catch(console.error);
