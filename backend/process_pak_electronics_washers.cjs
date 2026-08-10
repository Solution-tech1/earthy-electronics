const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['HWM', 'HD', 'HWS', 'HDF', 'KG', 'INV', 'INVERTER', 'FRONT', 'LOAD', 'TWIN', 'TUB'];

  return str
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')
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

function getCoreModelDetails(modelStr) {
  if (!modelStr) return { coreNum: '', raw: modelStr, variants: [] };
  
  let clean = modelStr.toUpperCase().trim();
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .trim();

  const numMatch = clean.match(/\d+/);
  const coreNum = numMatch ? numMatch[0] : '';
  return { coreNum, cleanModel: clean };
}

async function processPakWashers() {
  console.log("==================================================");
  console.log("🚀 PROCESSING WASHING MACHINES & DEEP FREEZERS FROM PAK-ELECTRONICS.PK");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const scrapedItems = [];
  const targetUrls = [
    'https://pak-electronics.pk/?s=Haier+washing+machine&post_type=product',
    'https://pak-electronics.pk/?s=HWM&post_type=product',
    'https://pak-electronics.pk/?s=HDF&post_type=product',
    'https://pak-electronics.pk/product-category/washing-machine/',
    'https://pak-electronics.pk/product-category/deep-freezer/'
  ];

  for (const tUrl of targetUrls) {
    console.log(`Navigating to ${tUrl}...`);
    try {
      await delay(2000);
      await page.goto(tUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      await page.evaluate(async () => {
        await new Promise((res) => {
          let total = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 300);
            total += 300;
            if (total >= document.body.scrollHeight || total > 10000) {
              clearInterval(timer);
              res();
            }
          }, 150);
        });
      });

      await delay(1500);

      const items = await page.evaluate(() => {
        const arr = [];
        document.querySelectorAll('li.product, div.product, article, div.product-grid-item').forEach(card => {
          const titleEl = card.querySelector('.woocommerce-loop-product__title, .product-title, h2, h3, a');
          const imgEl = card.querySelector('img');
          const title = titleEl ? titleEl.textContent.trim() : '';
          const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
          if (title.length > 3 && imgSrc) {
            arr.push({ title, imgSrc });
          }
        });
        return arr;
      });

      console.log(`   Scraped ${items.length} items from ${tUrl}`);
      scrapedItems.push(...items);

    } catch (e) {
      console.error(`   Error on ${tUrl}: ${e.message}`);
    }
  }

  await browser.close();

  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_wash_freez.json'), 'utf8'));
  const washers = parsed.washers;
  const freezers = parsed.freezers;

  let wmFound = 0, wmNotFound = 0;
  let dfFound = 0, dfNotFound = 0;

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  const unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  // Process Washers
  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING WASHING MACHINES:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < washers.length; idx++) {
    const item = washers[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    const match = scrapedItems.find(siteItem => {
      const cleanSite = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCore = coreNum.replace(/[^0-9]/g, '');
      return cleanCore && cleanCore.length >= 2 && cleanSite.includes(cleanCore);
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

        wmFound++;
        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 45000;
          const discountPrice = Math.round(priceNum * 0.95);
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Washing Machines', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier WM] ${title} -> Image: ${relativeUrl}`);
      } catch (err) {
        wmNotFound++;
        unmatchedRows.push(`"${idx + 1}","Haier","Washing Machines","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier WM] ${rawModel} (Download error)`);
      }
    } else {
      wmNotFound++;
      const notes = `Core number ${coreNum} not listed on pak-electronics.pk`;
      unmatchedRows.push(`"${idx + 1}","Haier","Washing Machines","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier WM] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  // Process Freezers
  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING DEEP FREEZERS:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < freezers.length; idx++) {
    const item = freezers[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    const match = scrapedItems.find(siteItem => {
      const cleanSite = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCore = coreNum.replace(/[^0-9]/g, '');
      return cleanCore && cleanCore.length >= 2 && cleanSite.includes(cleanCore);
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

        dfFound++;
        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 85000;
          const discountPrice = Math.round(priceNum * 0.95);
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Deep Freezers', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier Freezer] ${title} -> Image: ${relativeUrl}`);
      } catch (err) {
        dfNotFound++;
        unmatchedRows.push(`"${idx + 1}","Haier","Deep Freezers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Freezer] ${rawModel} (Download error)`);
      }
    } else {
      dfNotFound++;
      const notes = `Core number ${coreNum} not listed on pak-electronics.pk`;
      unmatchedRows.push(`"${idx + 1}","Haier","Deep Freezers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Freezer] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  fs.appendFileSync(unmatchedFile, unmatchedRows.join('\n') + '\n', 'utf8');

  console.log("\n==================================================");
  console.log("📊 PAK-ELECTRONICS.PK — WASHERS & FREEZERS EXECUTION REPORT");
  console.log("==================================================");
  console.log(`🧺 Washing Machines (${washers.length} Items): FOUND=${wmFound}, NOT_FOUND=${wmNotFound}`);
  console.log(`🧊 Deep Freezers (${freezers.length} Items): FOUND=${dfFound}, NOT_FOUND=${dfNotFound}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processPakWashers().catch(console.error);
