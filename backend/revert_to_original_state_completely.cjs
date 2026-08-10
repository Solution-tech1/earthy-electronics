const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

function normalizeCategory(cat, name = '') {
  cat = (cat || '').toLowerCase().trim();
  name = (name || '').toLowerCase().trim();

  if (cat.includes('air') || cat.includes('ac') || name.includes('air conditioner') || name.includes('inverter ac') || name.includes('split ac')) return 'Air Conditioners';
  if (cat.includes('wash') || cat.includes('wm') || name.includes('washer') || name.includes('washing')) return 'Washing Machines';
  if (cat.includes('refrig') || cat.includes('fridge') || name.includes('refrigerator') || name.includes('fridge')) return 'Refrigerators';
  if (cat.includes('micro') || cat.includes('oven') || name.includes('microwave')) return 'Microwave Ovens';
  if (cat.includes('tv') || cat.includes('led') || name.includes('tv')) return 'LED TVs';
  if (cat.includes('dispen') || name.includes('dispenser')) return 'Water Dispensers';
  if (cat.includes('freez') || name.includes('freezer')) return 'Deep Freezers';
  if (cat.includes('geyser') || name.includes('geyser') || name.includes('water heater')) return 'Geysers & Water Heaters';
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

async function revertToOriginalState() {
  console.log("==================================================");
  console.log("🔄 REVERTING ENTIRE SITE & DATABASE TO ORIGINAL CLEAN BASE STATE");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE products');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  const rows = [];

  await new Promise((resolve) => {
    fs.createReadStream(readyCsvPath)
      .pipe(csv())
      .on('data', (d) => rows.push(d))
      .on('end', resolve);
  });

  let count = 0;
  const seenNames = new Set();

  for (const r of rows) {
    const rawName = r.Model_Name || r.name;
    if (!rawName) continue;

    const name = toTitleCase(rawName);
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    const brand = (r.Brand || r.brand || 'Generic').replace(/[^\x00-\x7F]/g, ' ').trim();
    const category = normalizeCategory(r.Category || r.category, name);
    const priceNum = parseFloat((r.Rate || r.price || r.Price || '0').toString().replace(/[^\d.]/g, '')) || 50000;
    const discountPrice = Math.round(priceNum * 0.95);
    const imageUrl = (r.Image_URL || r.image || '').trim();

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
        10
      ]
    );
    count++;
  }

  // Append 33 Haier Refrigerators
  const refReports = ['pak_ref_final_report.json', 'pak_ref_chunk2_report.json'];
  let haierAdded = 0;

  for (const rf of refReports) {
    const rPath = path.join(__dirname, rf);
    if (fs.existsSync(rPath)) {
      const data = JSON.parse(fs.readFileSync(rPath, 'utf8'));
      for (const item of data) {
        if (item.image_status === 'FOUND_AND_UPLOADED') {
          const rawModel = item.model;
          const title = toTitleCase(`Haier ${rawModel}`);
          if (seenNames.has(title.toLowerCase())) continue;
          seenNames.add(title.toLowerCase());

          const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const relativeWebPath = `/images/products/${slug}.jpg`;
          const priceNum = item.mrp || 65000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              title,
              'Refrigerators',
              'Haier',
              priceNum,
              discountPrice,
              relativeWebPath,
              `Original Haier ${title}. Official warranty.`,
              10
            ]
          );
          haierAdded++;
        }
      }
    }
  }

  const [totalRows] = await db.query('SELECT COUNT(*) as total FROM products');

  console.log("\n==================================================");
  console.log("📊 REVERT COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`TOTAL PRODUCTS IN DB: ${totalRows[0].total}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

revertToOriginalState().catch(console.error);
