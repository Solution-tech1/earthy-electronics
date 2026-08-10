const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'SA', 'SD'];

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

async function processCategoryScrollSuperAsia() {
  console.log("==================================================");
  console.log("🚀 STARTING DIRECT CATEGORY SCROLL PROCESSOR — BRAND 5 (SUPER ASIA)");
  console.log("🌐 Official Portal: https://superasiastore.com");
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

  // Items 71 to 73 (Super Asia 3 products)
  const remaining50 = rows.slice(23);
  const saRows = remaining50.filter(r => {
    const b = (r.Brand || '').toLowerCase();
    const m = (r.Model_Name || '').toLowerCase();
    return b.includes('super asia') || m.startsWith('sa') || m.startsWith('sd');
  });

  console.log(`Loaded ${saRows.length} Super Asia target products...`);

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

  // Direct Category URLs on superasiastore.com
  const categoryUrls = [
    'https://superasiastore.com/product-category/washing-machines/',
    'https://superasiastore.com/product-category/spinners/'
  ];

  const scrapedCatalog = [];

  for (const catUrl of categoryUrls) {
    console.log(`\nNavigating to Category Page: ${catUrl}...`);
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      await delay(2500);

      // Auto-scroll to load lazy images & pagination
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight || totalHeight > 10000) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });

      await delay(2000);

      const items = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.product-item, .product-card, .item, li.product-item, .woocommerce-LoopProduct-link');
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

      console.log(`Scraped ${items.length} product items from category page: ${catUrl}`);
      scrapedCatalog.push(...items);
    } catch (e) {
      console.error(`Category Navigation Error (${catUrl}): ${e.message}`);
    }
  }

  await browser.close();

  let matchedCount = 0;
  let unverifiedCount = 0;

  const stillUnverifiedEntries = [];
  if (fs.existsSync(stillUnverifiedFile)) {
    const lines = fs.readFileSync(stillUnverifiedFile, 'utf8').trim().split('\n').slice(1);
    stillUnverifiedEntries.push(...lines);
  }

  for (let idx = 0; idx < saRows.length; idx++) {
    const r = saRows[idx];
    const rawModel = r.Model_Name || '';
    const cleanTargetDigits = rawModel.replace(/[^\d]/g, '');

    // Search collected category items
    const match = scrapedCatalog.find(item => {
      const cleanItemTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanTargetDigits.length >= 2 && cleanItemTitle.includes(cleanTargetDigits);
    });

    if (match && match.imgSrc) {
      const title = toTitleCase(rawModel);
      const slug = `super-asia-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

        matchedCount++;
        usedImages.add(relativeUrl);

        const category = normalizeCategory(r.Category, title);
        const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 28000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, category, 'Super Asia', priceNum, discountPrice, relativeUrl, `Original genuine Super Asia ${title}. Official warranty.`, 10]
        );
        console.log(`✅ MATCHED & ATTACHED [#${idx+1}]: [Super Asia] ${rawModel} -> ${relativeUrl}`);
      } catch (err) {
        unverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Super Asia","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Category match image download error"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [Super Asia] ${rawModel} (Download error)`);
      }
    } else {
      unverifiedCount++;
      stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Super Asia","${r.Category || ''}","${rawModel.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model not listed in official category page scroll"`);
      console.log(`❌ STILL_UNVERIFIED [#${idx+1}]: [Super Asia] ${rawModel} (Not listed in category page scroll)`);
    }
  }

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 CATEGORY SCROLL REPORT — BRAND 5 (SUPER ASIA - 3 PRODUCTS)");
  console.log("🌐 Official Portals Scrolled: /product-category/washing-machines & /spinners");
  console.log("==================================================");
  console.log(`✅ MATCHED & ATTACHED: ${matchedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${unverifiedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processCategoryScrollSuperAsia().catch(console.error);
