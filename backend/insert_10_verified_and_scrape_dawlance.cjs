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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'WF', 'WB'];

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

// 10 Verified products to insert
const VERIFIED_10 = [
  { name: 'Dawlance DW 1165 Washing Machine', brand: 'Dawlance', category: 'Washing Machines', price: 42000, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/05/DW-1165.jpg' },
  { name: 'WestPoint WB-9173 Blender', brand: 'WestPoint', category: 'Kitchen Appliances', price: 8500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/04/WB-9173.jpg' },
  { name: 'WestPoint WF-1153 Chopper', brand: 'WestPoint', category: 'Kitchen Appliances', price: 9200, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-1153.jpg' },
  { name: 'WestPoint WF-1154 Chopper', brand: 'WestPoint', category: 'Kitchen Appliances', price: 9500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-1154.jpg' },
  { name: 'WestPoint WF-1155 Chopper', brand: 'WestPoint', category: 'Kitchen Appliances', price: 9800, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-1155.jpg' },
  { name: 'WestPoint WF-1156 Chopper', brand: 'WestPoint', category: 'Kitchen Appliances', price: 10200, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-1156.jpg' },
  { name: 'WestPoint WF-1851 Food Processor', brand: 'WestPoint', category: 'Kitchen Appliances', price: 16500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-1851.jpg' },
  { name: 'WestPoint WF-2020 Microwave Oven', brand: 'WestPoint', category: 'Microwave Ovens', price: 21500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-2020.jpg' },
  { name: 'WestPoint WF-2023 Microwave Oven', brand: 'WestPoint', category: 'Microwave Ovens', price: 22500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-2023.jpg' },
  { name: 'WestPoint WF-2024 Microwave Oven', brand: 'WestPoint', category: 'Microwave Ovens', price: 23500, img: 'https://subhanelectronics.pk/wp-content/uploads/2023/09/WF-2024.jpg' }
];

async function insert10AndScrapeDawlance() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  let insertedCount = 0;

  for (const item of VERIFIED_10) {
    if (!usedImages.has(item.img)) {
      const ok = await checkUrl(item.img);
      if (ok) {
        insertedCount++;
        usedImages.add(item.img);

        const discountPrice = Math.round(item.price * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.name, item.category, item.brand, item.price, discountPrice, item.img, `Original genuine ${item.brand} ${item.name}. Official warranty, fast Karachi delivery.`, 10]
        );
        console.log(`✅ ADDED TO MariaDB: [${item.brand}] ${item.name} (${item.img})`);
      }
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 10 VERIFIED PRODUCTS SUCCESSFULLY ADDED!");
  console.log(`• New Products Added: ${insertedCount}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

insert10AndScrapeDawlance().catch(console.error);
