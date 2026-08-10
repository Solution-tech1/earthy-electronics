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

async function restoreAllImages() {
  console.log("==================================================");
  console.log("🔄 RESTORING ALL ORIGINAL PRODUCT IMAGES FROM Products_WITH_Images_READY.csv");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  const rows = [];

  await new Promise((resolve) => {
    fs.createReadStream(readyCsvPath)
      .pipe(csv())
      .on('data', (d) => rows.push(d))
      .on('end', resolve);
  });

  console.log(`Loaded ${rows.length} original products from Products_WITH_Images_READY.csv`);

  let restoredCount = 0;

  for (const r of rows) {
    const rawName = r.Model_Name || r.name;
    const imgUrl = (r.Image_URL || r.image || '').trim();
    if (!rawName || !imgUrl) continue;

    const name = toTitleCase(rawName);

    // Update product image in DB
    const [result] = await db.execute('UPDATE products SET image = ? WHERE name = ?', [imgUrl, name]);
    if (result.affectedRows > 0) {
      restoredCount += result.affectedRows;
    }
  }

  console.log(`✅ Restored original Image URLs for ${restoredCount} products in DB`);

  // Check DB status
  const [totalRows] = await db.query('SELECT COUNT(*) as total FROM products');
  const [withImg] = await db.query('SELECT COUNT(*) as total FROM products WHERE image != ""');

  console.log("\n==================================================");
  console.log("📊 RESTORATION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`TOTAL PRODUCTS IN DB: ${totalRows[0].total}`);
  console.log(`PRODUCTS WITH ACTIVE IMAGES: ${withImg[0].total}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

restoreAllImages().catch(console.error);
