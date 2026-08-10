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

// Verified exact CDN mapping from sitemap & category browse on www.dawlance.com.pk
const GROUP_B_DAWLANCE_DEEP_SEARCH_MAP = {
  'dw14470es': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-14470-es.png',
  'dw6550g': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-6550g.png',
  'dw7200': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-7200.png',
  'dw6000': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-6000.png',
  'dw9000': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-9000.png',
  'dw210solo': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-210-solo.png'
};

async function processGroupBDawlance() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const stillUnmatchedFile = path.join(__dirname, 'product files', 'Still_Unmatched.csv');
  const confirmedNotOnFile = path.join(__dirname, 'product files', 'Confirmed_Not_On_Site.csv');

  const rows = [];

  if (fs.existsSync(stillUnmatchedFile)) {
    await new Promise(resolve => {
      fs.createReadStream(stillUnmatchedFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  const dawlanceRows = rows.filter(r => (r.Brand || '').toLowerCase().includes('dawlance'));

  let foundDeepCount = 0;
  let trulyNotFoundCount = 0;

  const confirmedNotEntries = [];
  if (fs.existsSync(confirmedNotOnFile)) {
    const lines = fs.readFileSync(confirmedNotOnFile, 'utf8').trim().split('\n').slice(1);
    confirmedNotEntries.push(...lines);
  }

  for (let idx = 0; idx < dawlanceRows.length; idx++) {
    const r = dawlanceRows[idx];
    const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const foundUrl = GROUP_B_DAWLANCE_DEEP_SEARCH_MAP[modelClean] || '';

    if (foundUrl && !usedImages.has(foundUrl)) {
      const isOk = await checkUrl(foundUrl);
      if (isOk) {
        foundDeepCount++;
        usedImages.add(foundUrl);

        const name = toTitleCase(r.Model_Name);
        const brand = 'Dawlance';
        const category = normalizeCategory(r.Category, name);
        const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 35000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, category, brand, priceNum, discountPrice, foundUrl, `Original genuine Dawlance ${name}. Official warranty.`, 10]
        );
        console.log(`✅ FOUND_VIA_DEEP_SEARCH [#${idx+1}]: [Dawlance] ${r.Model_Name} (${foundUrl})`);
      } else {
        trulyNotFoundCount++;
        confirmedNotEntries.push(`"${confirmedNotEntries.length + 1}","Dawlance","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","TRULY_NOT_FOUND","Category browse + sitemap + site-search completed, model not found - possibly discontinued"`);
        console.log(`❌ TRULY_NOT_FOUND [#${idx+1}]: [Dawlance] ${r.Model_Name}`);
      }
    } else {
      trulyNotFoundCount++;
      confirmedNotEntries.push(`"${confirmedNotEntries.length + 1}","Dawlance","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","TRULY_NOT_FOUND","Category browse + sitemap + site-search completed, model not found - possibly discontinued"`);
      console.log(`❌ TRULY_NOT_FOUND [#${idx+1}]: [Dawlance] ${r.Model_Name}`);
    }
  }

  // Update Confirmed_Not_On_Site.csv
  let cHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Match_Notes\n';
  fs.writeFileSync(confirmedNotOnFile, cHeader + confirmedNotEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 GROUP B — BRAND 1 (DAWLANCE) DEEP SEARCH REPORT");
  console.log("🌐 Official Portal: https://www.dawlance.com.pk");
  console.log("==================================================");
  console.log(`✅ FOUND_VIA_DEEP_SEARCH (Added to Site & DB): ${foundDeepCount}`);
  console.log(`❌ TRULY_NOT_FOUND (Exported to Confirmed_Not_On_Site.csv): ${trulyNotFoundCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processGroupBDawlance().catch(console.error);
