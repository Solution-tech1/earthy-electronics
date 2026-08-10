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

async function restoreExactOriginals() {
  console.log("==================================================");
  console.log("🔄 RESTORING EXACT ORIGINAL PRODUCT IMAGES TO WEBSITE");
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

  console.log(`Loaded ${rows.length} original products from Products_WITH_Images_READY.csv`);

  let insertedCount = 0;
  const seenNames = new Set();

  for (const r of rows) {
    const rawName = r.Model_Name || r.name;
    if (!rawName) continue;

    const name = toTitleCase(rawName);
    if (seenNames.has(name.toLowerCase())) continue; // Deduplicate by model name
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
    insertedCount++;
  }

  console.log(`✅ Base Verified Products Inserted: ${insertedCount}`);

  // Now append the 33 newly matched Haier Refrigerators from pak-electronics.pk
  const refReports = ['pak_ref_final_report.json', 'pak_ref_chunk2_report.json'];
  let haierRefAdded = 0;

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
          haierRefAdded++;
        }
      }
    }
  }

  console.log(`✅ Newly Matched Haier Refrigerators Inserted: ${haierRefAdded}`);

  const [totalRows] = await db.query('SELECT COUNT(*) as total FROM products');
  const [withImg] = await db.query('SELECT COUNT(*) as total FROM products WHERE image != ""');

  console.log("\n==================================================");
  console.log("📊 RESTORATION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`TOTAL PRODUCTS IN DB: ${totalRows[0].total}`);
  console.log(`PRODUCTS WITH EXACT ORIGINAL IMAGES: ${withImg[0].total}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

restoreExactOriginals().catch(console.error);
