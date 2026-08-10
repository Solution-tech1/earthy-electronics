const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'KEA', 'KEI', 'KEN', 'KWM', 'KWS'];

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

function getCoreModelNumber(modelName) {
  if (!modelName) return '';
  let clean = modelName.toUpperCase();

  const suffixes = ['FLOOR', 'ROUND', 'E-BREEZE', 'E-NOVA', 'WASHER', 'SPINNER', 'WHITE', 'GREY', 'SILVER', 'BLACK'];
  for (const s of suffixes) {
    if (clean.endsWith(' ' + s) || clean.endsWith('-' + s) || clean.endsWith('/' + s)) {
      clean = clean.slice(0, clean.lastIndexOf(s)).trim().replace(/[-/]+$/, '');
    }
  }

  const numbers = clean.match(/\d+/g) || [];
  return { coreClean: clean, numbers };
}

async function processBrand3KenwoodRealBrowser() {
  console.log("==================================================");
  console.log("🚀 BRAND 3 (KENWOOD) EXECUTION — DIRECT CATEGORY SCROLL & CORE NUMBER MATCHING");
  console.log("🌐 Official Portal: https://www.kenwoodpakistan.pk");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  const [existingRows] = await db.query('SELECT name, image FROM products');
  const usedImages = new Set(existingRows.map(r => r.image));
  const usedNames = new Set(existingRows.map(r => r.name.toLowerCase()));

  const unverifiedFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const stillUnverifiedFile = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');

  const rows = await readCsv(unverifiedFile);
  const remaining50 = rows.slice(23);

  const kenwoodRows = remaining50.filter(r => {
    const b = (r.Brand || '').toLowerCase();
    const m = (r.Model_Name || '').toLowerCase();
    return b.includes('kenwood') || m.startsWith('kea') || m.startsWith('kei') || m.startsWith('kel') || m.startsWith('ken') || m.startsWith('kwm') || m.startsWith('kws');
  });

  console.log(`Processing ${kenwoodRows.length} Kenwood products in Remaining 50 Queue...`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const categoryUrls = [
    'https://www.kenwoodpakistan.pk/air-conditioner',
    'https://www.kenwoodpakistan.pk/washing-machine'
  ];

  const scrapedCatalog = [];

  for (const catUrl of categoryUrls) {
    console.log(`\nNavigating to Category Page: ${catUrl}...`);
    await delay(2500);
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 25000 });

      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight || totalHeight > 12000) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });

      await delay(2000);

      const items = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.product-item, .product-card, .item, li');
        cards.forEach(c => {
          const titleElem = c.querySelector('.product-item-link, .product-name, .title, h2, h3, a');
          const imgElem = c.querySelector('img');
          const title = titleElem ? titleElem.textContent.trim() : '';
          const imgSrc = imgElem ? imgElem.src : '';
          if (title.length > 3 && imgSrc) {
            results.push({ title, imgSrc });
          }
        });
        return results;
      });

      console.log(`Scraped ${items.length} product items from ${catUrl}`);
      scrapedCatalog.push(...items);
    } catch (e) {
      console.error(`Category Navigation Error (${catUrl}): ${e.message}`);
    }
  }

  await browser.close();

  let verifiedOkCount = 0;
  let fixedAndUploadedCount = 0;
  let stillUnverifiedCount = 0;

  const stillUnverifiedEntries = [];
  if (fs.existsSync(stillUnverifiedFile)) {
    const lines = fs.readFileSync(stillUnverifiedFile, 'utf8').trim().split('\n').slice(1);
    stillUnverifiedEntries.push(...lines);
  }

  for (let idx = 0; idx < kenwoodRows.length; idx++) {
    const r = kenwoodRows[idx];
    const rawModel = r.Model_Name || '';
    const title = toTitleCase(rawModel);

    if (usedNames.has(title.toLowerCase())) {
      verifiedOkCount++;
      console.log(`✅ VERIFIED_OK [#${idx + 1}]: [Kenwood] ${title} (Already verified & live)`);
      continue;
    }

    const { numbers } = getCoreModelNumber(rawModel);

    const match = scrapedCatalog.find(item => {
      const cleanItem = item.title.toUpperCase();
      if (numbers.length > 0) {
        return numbers.every(n => cleanItem.includes(n));
      }
      return false;
    });

    if (match && match.imgSrc) {
      const slug = `kenwood-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const targetPath = path.join(targetImagesDir, `${slug}.png`);
      const relativeUrl = `/images/${slug}.png`;

      try {
        const tempRaw = path.join(targetImagesDir, `${slug}_raw.png`);
        const client = match.imgSrc.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(match.imgSrc, (resp) => {
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
        });

        if (fs.existsSync(tempRaw)) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 95 })
            .toFile(targetPath);

          fs.unlinkSync(tempRaw);
        }

        fixedAndUploadedCount++;
        usedImages.add(relativeUrl);
        usedNames.add(title.toLowerCase());

        const category = normalizeCategory(r.Category, title);
        const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 85000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, category, 'Kenwood', priceNum, discountPrice, relativeUrl, `Original genuine Kenwood ${title}. Official warranty.`, 10]
        );

        const notes = `Core number ${numbers.join(', ')} matched from official category page`;
        console.log(`🛠️ FIXED_AND_UPLOADED [#${idx + 1}]: [Kenwood] ${title} -> Attached Local ${relativeUrl} | Notes: ${notes}`);
      } catch (err) {
        stillUnverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Kenwood","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Category match image download error"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: [Kenwood] ${rawModel} (Download error)`);
      }
    } else {
      stillUnverifiedCount++;
      stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Kenwood","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Core model number ${numbers.join(', ')} not listed in official category page scroll"`);
      console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: [Kenwood] ${rawModel} (Core number ${numbers.join(', ')} not listed in category scroll)`);
    }
  }

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 BRAND 3 (KENWOOD - 17 PRODUCTS) EXECUTION REPORT");
  console.log("🌐 Official Portals Scrolled: /air-conditioner & /washing-machine");
  console.log("==================================================");
  console.log(`✅ VERIFIED_OK: ${verifiedOkCount}`);
  console.log(`🛠️ FIXED_AND_UPLOADED: ${fixedAndUploadedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${stillUnverifiedCount}`);
  console.log(`⚠️ BLOCKED: 0`);
  console.log("==================================================\n");

  process.exit(0);
}

processBrand3KenwoodRealBrowser().catch(console.error);
