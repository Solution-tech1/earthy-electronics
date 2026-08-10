const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');
const http = require('http');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 8000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 400) return resolve(false);
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => { fileStream.close(); resolve(true); });
      fileStream.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD'];

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

async function processAndCleanUserManual23Items() {
  console.log("==================================================");
  console.log("🧼 PROCESSING, WHITENING & INSERTING USER'S 23 MANUAL ITEMS...");
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

  const sourceFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const rows = [];

  if (fs.existsSync(sourceFile)) {
    await new Promise(resolve => {
      fs.createReadStream(sourceFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  // First 23 rows
  const first23 = rows.slice(0, 23);
  console.log(`Loaded ${first23.length} items from CDN_Unverified.csv (#1 to #23):`);

  let addedCount = 0;
  let alreadyExistCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < first23.length; idx++) {
    const r = first23[idx];
    const brand = r.Brand || 'Generic';
    const rawModel = r.Model_Name || 'Appliance';
    const title = toTitleCase(rawModel);
    const imageUrl = (r.Image_URL || '').trim();

    if (usedNames.has(title.toLowerCase())) {
      alreadyExistCount++;
      console.log(`ℹ️ ALREADY LIVE [#${idx+1}]: [${brand}] ${title}`);
      continue;
    }

    if (!imageUrl || !imageUrl.startsWith('http')) {
      failedCount++;
      console.log(`⚠️ MISSING/INVALID URL [#${idx+1}]: [${brand}] ${title}`);
      continue;
    }

    const slug = `${brand}-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rawPath = path.join(imagesDir, `${slug}_raw.png`);
    const cleanPath = path.join(imagesDir, `${slug}.png`);
    const relativeUrl = `/images/${slug}.png`;

    const downloaded = await downloadImage(imageUrl, rawPath);

    if (downloaded && fs.existsSync(rawPath)) {
      try {
        // Flatten image onto pure studio white background #FFFFFF & auto-crop padding
        await sharp(rawPath)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png({ quality: 95 })
          .toFile(cleanPath);
      } catch (e) {
        fs.copyFileSync(rawPath, cleanPath);
      }

      try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch (e) {}

      if (!usedImages.has(relativeUrl)) {
        addedCount++;
        usedImages.add(relativeUrl);
        usedNames.add(title.toLowerCase());

        const category = normalizeCategory(r.Category, title);
        const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 45000;
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

        console.log(`✨ WHITENED & ADDED TO LIVE DB [#${idx+1}]: [${brand}] ${title} -> ${relativeUrl}`);
      }
    } else {
      failedCount++;
      console.log(`❌ DOWNLOAD FAILED 404 [#${idx+1}]: [${brand}] ${title} (${imageUrl})`);
    }
  }

  const [stats] = await db.query('SELECT count(*) as total, count(DISTINCT image) as unique_imgs FROM products');

  console.log("\n==================================================");
  console.log("🎉 USER'S 23 MANUAL ITEMS PROCESSING COMPLETE!");
  console.log(`• Newly Added to Live MariaDB: ${addedCount}`);
  console.log(`• Already Existing Live Items: ${alreadyExistCount}`);
  console.log(`• Failed/Invalid URLs: ${failedCount}`);
  console.log(`• Total Live Products in MariaDB: ${stats[0].total}`);
  console.log(`• Total Unique Images in MariaDB: ${stats[0].unique_imgs}`);
  console.log("==================================================\n");

  process.exit(0);
}

processAndCleanUserManual23Items().catch(console.error);
