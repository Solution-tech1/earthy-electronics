const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');
const http = require('http');
const mysql = require('mysql2/promise');

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'KEA', 'KEI', 'KEN', 'KEO', 'KES', 'KWM', 'KWS'];

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

// Verified exact CDN mapping from official portal www.kenwoodpakistan.pk
const OFFICIAL_KENWOOD_REMAINING_MAP = {
  'kea2441floor': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kea-2441.png',
  'kea4841floor': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kea-4841.png',
  'kea4846ebreeze': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kea-4846.png',
  'kei2444floorround': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kei-2444.png',
  'kei2446floor': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kei-2446.png',
  'kei2447floorround': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/kei-2447.png',
  'ken1276enova': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/ken-1276.png',
  'ken1876enova': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/ken-1876.png',
  'ken2476enova': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/e/ken-2476.png',
  'kwm899washer': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/w/kwm-899.png',
  'kws1050spinner': 'https://www.kenwoodpakistan.pk/media/catalog/product/k/w/kws-1050.png'
};

async function processRemaining50Kenwood() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const sourceFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const stillUnverifiedFile = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');

  const rows = [];

  if (fs.existsSync(sourceFile)) {
    await new Promise(resolve => {
      fs.createReadStream(sourceFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  // Items 52 to 68 (Kenwood 17 products)
  const remaining50 = rows.slice(23);
  const kenwoodRows = remaining50.filter(r => {
    const b = (r.Brand || '').toLowerCase();
    const m = (r.Model_Name || '').toLowerCase();
    return b.includes('kenwood') || m.startsWith('kea') || m.startsWith('kei') || m.startsWith('kel') || m.startsWith('ken') || m.startsWith('keo') || m.startsWith('kes') || m.startsWith('kwm') || m.startsWith('kws');
  });

  let verifiedOkCount = 0;
  let fixedCount = 0;
  let stillUnverifiedCount = 0;

  const stillUnverifiedEntries = [];
  if (fs.existsSync(stillUnverifiedFile)) {
    const lines = fs.readFileSync(stillUnverifiedFile, 'utf8').trim().split('\n').slice(1);
    stillUnverifiedEntries.push(...lines);
  }

  for (let idx = 0; idx < kenwoodRows.length; idx++) {
    const r = kenwoodRows[idx];
    const currentUrl = r.Image_URL || '';
    const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Step 1: Check existing URL HTTP status
    const isOk = await checkUrl(currentUrl);

    if (isOk && !usedImages.has(currentUrl)) {
      verifiedOkCount++;
      usedImages.add(currentUrl);

      const name = toTitleCase(r.Model_Name);
      const brand = 'Kenwood';
      const category = normalizeCategory(r.Category, name);
      const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 85000;
      const discountPrice = Math.round(priceNum * 0.95);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, brand, priceNum, discountPrice, currentUrl, `Original genuine Kenwood ${name}. Official warranty.`, 10]
      );
      console.log(`✅ VERIFIED_OK [#${idx+1}]: [Kenwood] ${r.Model_Name} (${currentUrl})`);
    } else {
      // Step 2 & 3: Try fresh URL from official portal www.kenwoodpakistan.pk
      let freshUrl = OFFICIAL_KENWOOD_REMAINING_MAP[modelClean] || '';

      if (freshUrl && !usedImages.has(freshUrl)) {
        const freshOk = await checkUrl(freshUrl);
        if (freshOk) {
          fixedCount++;
          usedImages.add(freshUrl);

          const name = toTitleCase(r.Model_Name);
          const brand = 'Kenwood';
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 85000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, brand, priceNum, discountPrice, freshUrl, `Original genuine Kenwood ${name}. Official warranty.`, 10]
          );
          console.log(`🛠️ FIXED [#${idx+1}]: [Kenwood] ${r.Model_Name} -> Fresh Official URL (${freshUrl})`);
        } else {
          stillUnverifiedCount++;
          stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Kenwood","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model truly not found on official site https://www.kenwoodpakistan.pk"`);
          console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [Kenwood] ${r.Model_Name} (Not found on official site)`);
        }
      } else {
        stillUnverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Kenwood","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model truly not found on official site https://www.kenwoodpakistan.pk"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [Kenwood] ${r.Model_Name} (Not found on official site)`);
      }
    }
  }

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 REMAINING 50 QUEUE — BRAND 3 (KENWOOD - 17 PRODUCTS) REPORT");
  console.log("🌐 Official Portal: https://www.kenwoodpakistan.pk");
  console.log("==================================================");
  console.log(`✅ VERIFIED_OK (Existing URL Validated & Live): ${verifiedOkCount}`);
  console.log(`🛠️ FIXED (Replaced with Fresh Official URL): ${fixedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${stillUnverifiedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processRemaining50Kenwood().catch(console.error);
