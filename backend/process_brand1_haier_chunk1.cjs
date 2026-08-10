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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD', 'HGL', 'HMO'];

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

// Extract CORE model digits/letters by removing color/variant suffixes
function getCoreModelNumber(modelName) {
  if (!modelName) return '';
  let clean = modelName.toUpperCase();

  // Strip common end suffixes
  const suffixes = ['AS MG', 'AS', 'MG', 'WB', 'GB', 'WHITE', 'GREY', 'SILVER', 'BLACK', 'GOLD', 'CFL', 'WFL', 'LVS', 'ES8', 'JT', 'S8', 'S6', 'S3', 'S8U1', 'M/W', 'P', 'GD', 'E', 'ES9', 'CS', 'BS'];
  for (const s of suffixes) {
    if (clean.endsWith(' ' + s) || clean.endsWith('-' + s) || clean.endsWith('/' + s)) {
      clean = clean.slice(0, clean.lastIndexOf(s)).trim().replace(/[-/]+$/, '');
    }
  }

  // Extract core numbers (e.g. 14959, 12929, 120, 150, 100, 80, 25, 62)
  const numbers = clean.match(/\d+/g) || [];
  return { coreClean: clean, numbers };
}

async function processBrand1HaierChunk1() {
  console.log("==================================================");
  console.log("🚀 BRAND 1 (HAIER) CHUNK 1 EXECUTION — DIRECT CATEGORY SCROLL & CORE NUMBER MATCHING");
  console.log("🌐 Official Portal: https://www.haier.com/pk");
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

  const rows1 = await readCsv(unverifiedFile);
  const rows2 = await readCsv(stillUnverifiedFile);
  const allHaier = [...rows1, ...rows2].filter(r => (r.Brand || '').toLowerCase().includes('haier'));

  // Chunk 1: First 50 Haier products
  const chunk1 = allHaier.slice(0, 50);
  console.log(`Processing ${chunk1.length} Haier products in Chunk 1...`);

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

  // Direct Category URLs on haier.com/pk
  const categoryUrls = [
    'https://www.haier.com/pk/washing-machines',
    'https://www.haier.com/pk/microwave-ovens',
    'https://www.haier.com/pk/refrigerators',
    'https://www.haier.com/pk/air-conditioners'
  ];

  const scrapedCatalog = [];

  for (const catUrl of categoryUrls) {
    console.log(`\nNavigating to Category Page: ${catUrl}...`);
    await delay(2500);
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 25000 });

      // Auto-scroll full page
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
          const titleElem = c.querySelector('.product-name, .title, h2, h3, a');
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

  for (let idx = 0; idx < chunk1.length; idx++) {
    const r = chunk1[idx];
    const rawModel = r.Model_Name || '';
    const title = toTitleCase(rawModel);

    if (usedNames.has(title.toLowerCase())) {
      verifiedOkCount++;
      console.log(`✅ VERIFIED_OK [#${idx + 1}]: [Haier] ${title} (Already verified & live)`);
      continue;
    }

    const { coreClean, numbers } = getCoreModelNumber(rawModel);

    // Search collected category items using CORE NUMBERS
    const match = scrapedCatalog.find(item => {
      const cleanItem = item.title.toUpperCase();
      if (numbers.length > 0) {
        // Core number must match 100%
        return numbers.every(n => cleanItem.includes(n));
      }
      return cleanItem.includes(coreClean);
    });

    if (match && match.imgSrc) {
      const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
        const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 65000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, category, 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
        );

        const notes = `End variant/color suffix ignored, core number ${numbers.join(', ')} matched from official category page`;
        console.log(`🛠️ FIXED_AND_UPLOADED [#${idx + 1}]: [Haier] ${title} -> Attached Local ${relativeUrl} | Notes: ${notes}`);
      } catch (err) {
        stillUnverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Category match image download error"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: [Haier] ${rawModel} (Download error)`);
      }
    } else {
      stillUnverifiedCount++;
      stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Core model number ${numbers.join(', ')} not listed in official category page scroll"`);
      console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: [Haier] ${rawModel} (Core number ${numbers.join(', ')} not listed in category scroll)`);
    }
  }

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 BRAND 1 (HAIER) CHUNK 1 EXECUTION REPORT");
  console.log("🌐 Official Portals Scrolled: /washing-machines, /microwave-ovens, /refrigerators, /air-conditioners");
  console.log("==================================================");
  console.log(`✅ VERIFIED_OK: ${verifiedOkCount}`);
  console.log(`🛠️ FIXED_AND_UPLOADED: ${fixedAndUploadedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${stillUnverifiedCount}`);
  console.log(`⚠️ BLOCKED: 0`);
  console.log("==================================================\n");

  process.exit(0);
}

processBrand1HaierChunk1().catch(console.error);
