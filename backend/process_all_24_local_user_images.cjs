const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const csv = require('csv-parser');

const readCsv = (filePath) => {
  return new Promise((resolve) => {
    const results = [];
    if (fs.existsSync(filePath)) {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (d) => results.push(d))
        .on('end', () => resolve(results));
    } else {
      resolve([]);
    }
  });
};

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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD', 'CS', 'BP', 'S8', 'S6', 'S3', 'JT', 'ES8'];

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

async function processAll24LocalUserImages() {
  console.log("==================================================");
  console.log("🧼 PROCESSING ALL 24 LOCAL USER-DOWNLOADED IMAGES FROM products FOLDER...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const productsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const [existingRows] = await db.query('SELECT name, image FROM products');
  const usedImages = new Set(existingRows.map(r => r.image));
  const usedNames = new Set(existingRows.map(r => r.name.toLowerCase()));

  const unverifiedList = await readCsv(path.join(__dirname, 'product files', 'CDN_Unverified.csv'));
  const list216 = await readCsv(path.join(__dirname, 'product files', 'Still_Unmatched.csv'));
  const allKnownModels = [...unverifiedList, ...list216];

  const files = fs.readdirSync(productsDir);
  let addedCount = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const fileName = files[idx];
    const ext = path.extname(fileName).toLowerCase();
    if (!['.jpg', '.png', '.jpeg', '.webp', '.jfif'].includes(ext)) continue;

    const fullPath = path.join(productsDir, fileName);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() || stat.size < 500) continue;

    const cleanFileName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Model matching logic
    let matched = allKnownModels.find(p => {
      const pClean = (p.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return pClean.length > 2 && (cleanFileName.includes(pClean) || pClean.includes(cleanFileName));
    });

    if (!matched) {
      if (cleanFileName.includes('105kg') || cleanFileName.includes('hwd105')) {
        matched = { Brand: 'Haier', Model_Name: 'Haier 10.5Kg Washer/Dryer Front Load Washing Machine Wifi HWD 105-B14959-S8U1/On Installment', Category: 'Washing Machines', Rate: '185000' };
      } else if (cleanFileName.includes('8kgfrontload') || cleanFileName.includes('hwm80bp')) {
        matched = { Brand: 'Haier', Model_Name: 'Haier 8kg Front Load Washing Machine HWM 80-BP12929-S3/On Installment', Category: 'Washing Machines', Rate: '145000' };
      } else if (cleanFileName.includes('dw260lvs')) {
        matched = { Brand: 'Dawlance', Model_Name: 'DW-260 LVS Golden', Category: 'Washing Machines', Rate: '48000' };
      }
    }

    if (matched) {
      const brand = matched.Brand || 'Generic';
      const rawModel = matched.Model_Name || 'Appliance';
      const title = toTitleCase(rawModel);

      const slug = `${brand}-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const targetPath = path.join(targetImagesDir, `${slug}.png`);
      const relativeUrl = `/images/${slug}.png`;

      // Whiten background using Sharp onto pure white #FFFFFF canvas
      try {
        await sharp(fullPath)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png({ quality: 95 })
          .toFile(targetPath);
      } catch (e) {
        fs.copyFileSync(fullPath, targetPath);
      }

      if (!usedImages.has(relativeUrl) && !usedNames.has(title.toLowerCase())) {
        addedCount++;
        usedImages.add(relativeUrl);
        usedNames.add(title.toLowerCase());

        const category = normalizeCategory(matched.Category, title);
        const priceNum = parseFloat((matched.Rate || '0').toString().replace(/[^\d.]/g, '')) || 55000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            category,
            brand,
            priceNum,
            discountPrice,
            relativeUrl,
            `Original genuine ${brand} ${title}. Official warranty, fast Karachi delivery, and installation support.`,
            10
          ]
        );

        console.log(`✨ WHITENED & ADDED TO LIVE DB: [${brand}] ${title} -> ${relativeUrl}`);
      } else {
        console.log(`ℹ️ ALREADY LIVE: [${brand}] ${title}`);
      }
    } else {
      console.log(`⚠️ COULD NOT MATCH MODEL NAME: ${fileName}`);
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 ALL LOCAL USER IMAGES PROCESSING COMPLETE!");
  console.log(`• Newly Added to Live MariaDB: ${addedCount}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

processAll24LocalUserImages().catch(console.error);
