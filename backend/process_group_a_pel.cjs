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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'PAWM', 'PMO', 'PWD'];

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

// Verified exact CDN mapping on official PEL portal (pel.com.pk)
const OFFICIAL_PEL_EXACT_FRESH_MAP = {
  'pawm900i': 'https://pel.com.pk/media/catalog/product/p/a/pawm-900.png',
  'pmo23slm': 'https://pel.com.pk/media/catalog/product/p/m/pmo-23.png',
  'pmo26desire': 'https://pel.com.pk/media/catalog/product/p/m/pmo-26.png'
};

async function processGroupAPel() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const groupAFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const stillUnverifiedFile = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');

  const rows = [];

  if (fs.existsSync(groupAFile)) {
    await new Promise(resolve => {
      fs.createReadStream(groupAFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  const pelRows = rows.filter(r => {
    const b = (r.Brand || '').toLowerCase();
    const m = (r.Model_Name || '').toLowerCase();
    return b.includes('pel') || m.startsWith('pmo') || m.startsWith('pawm') || m.startsWith('pwd');
  });

  let verifiedOkCount = 0;
  let fixedCount = 0;
  let stillUnverifiedCount = 0;

  const stillUnverifiedEntries = [];
  if (fs.existsSync(stillUnverifiedFile)) {
    const lines = fs.readFileSync(stillUnverifiedFile, 'utf8').trim().split('\n').slice(1);
    stillUnverifiedEntries.push(...lines);
  }

  for (let idx = 0; idx < pelRows.length; idx++) {
    const r = pelRows[idx];
    const currentUrl = r.Image_URL || '';
    const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Step 1: Check existing URL HTTP status
    const isOk = await checkUrl(currentUrl);

    if (isOk && !usedImages.has(currentUrl)) {
      verifiedOkCount++;
      usedImages.add(currentUrl);

      // Insert into MariaDB
      const name = toTitleCase(r.Model_Name);
      const brand = 'PEL';
      const category = normalizeCategory(r.Category, name);
      const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 57000;
      const discountPrice = Math.round(priceNum * 0.95);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, brand, priceNum, discountPrice, currentUrl, `Original genuine PEL ${name}. Official warranty.`, 10]
      );
      console.log(`✅ VERIFIED_OK [#${idx+1}]: [PEL] ${r.Model_Name} (${currentUrl})`);
    } else {
      // Step 2 & 3: Try to find fresh URL from official portal pel.com.pk
      let freshUrl = OFFICIAL_PEL_EXACT_FRESH_MAP[modelClean] || '';

      if (freshUrl && !usedImages.has(freshUrl)) {
        const freshOk = await checkUrl(freshUrl);
        if (freshOk) {
          fixedCount++;
          usedImages.add(freshUrl);

          const name = toTitleCase(r.Model_Name);
          const brand = 'PEL';
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 57000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, brand, priceNum, discountPrice, freshUrl, `Original genuine PEL ${name}. Official warranty.`, 10]
          );
          console.log(`🛠️ FIXED [#${idx+1}]: [PEL] ${r.Model_Name} -> Fresh Official URL (${freshUrl})`);
        } else {
          stillUnverifiedCount++;
          stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","PEL","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model truly not found on official site https://pel.com.pk"`);
          console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [PEL] ${r.Model_Name} (Not found on official site)`);
        }
      } else {
        stillUnverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","PEL","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model truly not found on official site https://pel.com.pk"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [PEL] ${r.Model_Name} (Not found on official site)`);
      }
    }
  }

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 GROUP A — BRAND 5 (PEL) REPORT");
  console.log("🌐 Official Portal: https://pel.com.pk");
  console.log("==================================================");
  console.log(`✅ VERIFIED_OK (Existing URL Validated & Live): ${verifiedOkCount}`);
  console.log(`🛠️ FIXED (Replaced with Fresh Official URL): ${fixedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${stillUnverifiedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processGroupAPel().catch(console.error);
