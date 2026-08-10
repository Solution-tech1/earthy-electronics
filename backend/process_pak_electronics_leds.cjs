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
  const keepUpper = ['H32', 'H43', 'H50', 'H55', 'H65', 'H75', 'H85', 'HDR', 'QLED', 'OLED', 'TV', 'LED', '4K', 'UHD', 'FHD', 'HD', 'GB', 'RAM', 'ROM', 'PK'];

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
  if (!modelStr) return { coreNum: '', raw: modelStr };
  let clean = modelStr.toUpperCase().trim();
  const numMatch = clean.match(/\d+/);
  const coreNum = numMatch ? numMatch[0] : '';
  return { coreNum, cleanModel: clean };
}

async function processPakLeds() {
  console.log("==================================================");
  console.log("🚀 PROCESSING LED TVs & WATER DISPENSERS FROM PAK-ELECTRONICS.PK");
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
    'https://pak-electronics.pk/?s=Haier+LED&post_type=product',
    'https://pak-electronics.pk/?s=HDR&post_type=product',
    'https://pak-electronics.pk/product-category/led-tv/',
    'https://pak-electronics.pk/product-category/water-dispenser/'
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

  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_led_disp.json'), 'utf8'));
  const leds = parsed.leds;
  const dispensers = parsed.dispensers;

  let tvFound = 0, tvNotFound = 0;
  let dispFound = 0, dispNotFound = 0;

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  const unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  // Process TVs
  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING LED TVs:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < leds.length; idx++) {
    const item = leds[idx];
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

        tvFound++;
        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 89000;
          const discountPrice = Math.round(priceNum * 0.95);
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'LED TVs', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier TV] ${title} -> Image: ${relativeUrl}`);
      } catch (err) {
        tvNotFound++;
        unmatchedRows.push(`"${idx + 1}","Haier","LED TVs","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier TV] ${rawModel} (Download error)`);
      }
    } else {
      tvNotFound++;
      const notes = `Core number ${coreNum} not listed on pak-electronics.pk`;
      unmatchedRows.push(`"${idx + 1}","Haier","LED TVs","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier TV] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  // Process Dispensers
  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING WATER DISPENSERS:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < dispensers.length; idx++) {
    const item = dispensers[idx];
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

        dispFound++;
        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 45000;
          const discountPrice = Math.round(priceNum * 0.95);
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Water Dispensers', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier Dispenser] ${title} -> Image: ${relativeUrl}`);
      } catch (err) {
        dispNotFound++;
        unmatchedRows.push(`"${idx + 1}","Haier","Water Dispensers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Dispenser] ${rawModel} (Download error)`);
      }
    } else {
      dispNotFound++;
      const notes = `Core number ${coreNum} not listed on pak-electronics.pk`;
      unmatchedRows.push(`"${idx + 1}","Haier","Water Dispensers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Dispenser] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  fs.appendFileSync(unmatchedFile, unmatchedRows.join('\n') + '\n', 'utf8');

  console.log("\n==================================================");
  console.log("📊 PAK-ELECTRONICS.PK — LED TVs & WATER DISPENSERS EXECUTION REPORT");
  console.log("==================================================");
  console.log(`📺 LED TVs (${leds.length} Items): FOUND=${tvFound}, NOT_FOUND=${tvNotFound}`);
  console.log(`🚰 Water Dispensers (${dispensers.length} Items): FOUND=${dispFound}, NOT_FOUND=${dispNotFound}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processPakLeds().catch(console.error);
