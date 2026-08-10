const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'WF', 'WB', 'SA', 'SD'];

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

async function convertBackgroundToWhite(inputPath, outputPath) {
  try {
    const tempPath = outputPath + '.tmp.png';

    // Flatten image onto pure white studio background #FFFFFF
    await sharp(inputPath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 95 })
      .toFile(tempPath);

    if (fs.existsSync(tempPath)) {
      fs.copyFileSync(tempPath, outputPath);
      fs.unlinkSync(tempPath);
    }
    return true;
  } catch (err) {
    console.error(`Error processing image background: ${err.message}`);
    return false;
  }
}

async function processAndCleanManualImages() {
  console.log("==================================================");
  console.log("🧼 EXECUTING ON-DEMAND MANUAL IMAGE CLEAN & SYNC...");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const imagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const [existingRows] = await db.query('SELECT name, image FROM products');
  const usedImages = new Set(existingRows.map(r => r.image));
  const usedNames = new Set(existingRows.map(r => r.name.toLowerCase()));

  const list73 = await readCsv(path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv'));
  const list216 = await readCsv(path.join(__dirname, 'product files', 'Still_Unmatched.csv'));
  const allPending = [...list73, ...list216];

  let processedCount = 0;
  const files = fs.readdirSync(imagesDir);

  for (const fileName of files) {
    const ext = path.extname(fileName).toLowerCase();
    if (!['.jpg', '.png', '.jpeg', '.webp', '.jfif'].includes(ext)) continue;
    if (fileName.includes('.tmp.')) continue;

    const fullPath = path.join(imagesDir, fileName);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() || stat.size < 500) continue;

    const cleanFileName = path.basename(fileName, ext).toLowerCase().replace(/[^a-z0-9]/g, '');

    const matched = allPending.find(p => {
      const pClean = (p.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return pClean.length > 2 && (cleanFileName.includes(pClean) || pClean.includes(cleanFileName));
    });

    if (matched) {
      const brand = matched.Brand || 'Generic';
      const rawModel = matched.Model_Name || 'Appliance';
      const title = toTitleCase(rawModel);

      const targetFileName = `${brand}-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '_white.png';
      const cleanPath = path.join(imagesDir, targetFileName);
      const relativeUrl = `/images/${targetFileName}`;

      // Whiten background using Sharp
      await convertBackgroundToWhite(fullPath, cleanPath);

      if (!usedImages.has(relativeUrl) && !usedNames.has(title.toLowerCase())) {
        processedCount++;
        usedImages.add(relativeUrl);
        usedNames.add(title.toLowerCase());

        const category = normalizeCategory(matched.Category, title);
        const priceNum = parseFloat((matched.Rate || '0').toString().replace(/[^\d.]/g, '')) || 32000;
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

        console.log(`✨ WHITENED & ADDED TO DB: [${brand}] ${title} -> ${relativeUrl}`);
      }
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 ON-DEMAND CLEANING & SYNC COMPLETED!");
  console.log(`• New Cleaned White-BG Images Added: ${processedCount}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

processAndCleanManualImages().catch(console.error);
