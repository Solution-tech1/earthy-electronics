const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function getCoreModel(modelStr) {
  if (!modelStr) return '';
  let clean = modelStr.toUpperCase().trim();
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\(IOT\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .replace(/\bBLACK\b/gi, '')
               .replace(/\bSILVER\b/gi, '')
               .trim();

  // Handle slashes
  if (clean.includes('/')) {
    clean = clean.split('/')[0].trim();
  }
  return clean;
}

function getCoreNumber(modelStr) {
  const core = getCoreModel(modelStr);
  const m = core.match(/\d+/);
  return m ? m[0] : '';
}

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['HRF', 'HR', 'HRB', 'EBS', 'EBD', 'EPR', 'EP', 'ID', 'GD', 'FD', 'SD', 'DC', 'INOX', 'REF', 'KG'];
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

async function processHaierRefChunk1() {
  console.log("==================================================");
  console.log("🚀 CATEGORY 1: REFRIGERATORS CHUNK 1 (50 PRODUCTS)");
  console.log("==================================================");

  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_refrigerators_parsed.json'), 'utf8');
  const allRefItems = JSON.parse(rawJson);
  const chunk1 = allRefItems.slice(0, 50);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) {
    fs.mkdirSync(imagesOutputDir, { recursive: true });
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

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

  // Portals in priority order
  const siteCatalogs = {
    'haier.com/pk': [],
    'ishopping.pk': [],
    'qistbazaar.pk': [],
    'pak-electronics.pk': []
  };

  // 1. Haier Official Category Browsing
  console.log("\n1. Browsing https://www.haier.com/pk/refrigerators/ ...");
  try {
    await page.goto('https://www.haier.com/pk/refrigerators/', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(3000);
    // Scroll through page
    await page.evaluate(async () => {
      await new Promise(res => {
        let t = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 400);
          t += 400;
          if (t >= document.body.scrollHeight || t > 10000) {
            clearInterval(timer);
            res();
          }
        }, 150);
      });
    });

    const haierItems = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('.product-item, .productCard, .product-card, .item').forEach(el => {
        const titleEl = el.querySelector('.product-title, .title, h3, a');
        const imgEl = el.querySelector('img');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
        if (title.length > 3 && imgSrc) arr.push({ title, imgSrc });
      });
      return arr;
    });

    console.log(`   Scraped ${haierItems.length} products from haier.com/pk`);
    siteCatalogs['haier.com/pk'] = haierItems;
  } catch (e) {
    console.error(`   Error browsing haier.com/pk: ${e.message}`);
  }

  // 2. iShopping Browsing
  console.log("\n2. Browsing https://www.ishopping.pk/home-appliances/refrigerators.html ...");
  try {
    await page.goto('https://www.ishopping.pk/home-appliances/refrigerators.html', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(2000);
    const ishopItems = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('.product-item, .item').forEach(el => {
        const titleEl = el.querySelector('.product-item-link, a');
        const imgEl = el.querySelector('img');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
        if (title.toLowerCase().includes('haier') && imgSrc) arr.push({ title, imgSrc });
      });
      return arr;
    });
    console.log(`   Scraped ${ishopItems.length} Haier products from ishopping.pk`);
    siteCatalogs['ishopping.pk'] = ishopItems;
  } catch (e) {
    console.error(`   Error browsing ishopping.pk: ${e.message}`);
  }

  // 3. QistBazaar Browsing
  console.log("\n3. Browsing https://www.qistbazaar.pk/product-category/refrigerator/ ...");
  try {
    await page.goto('https://www.qistbazaar.pk/product-category/refrigerator/', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(2000);
    const qistItems = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('.product, .product-grid-item').forEach(el => {
        const titleEl = el.querySelector('.product-title, h3, a');
        const imgEl = el.querySelector('img');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
        if (title.toLowerCase().includes('haier') && imgSrc) arr.push({ title, imgSrc });
      });
      return arr;
    });
    console.log(`   Scraped ${qistItems.length} Haier products from qistbazaar.pk`);
    siteCatalogs['qistbazaar.pk'] = qistItems;
  } catch (e) {
    console.error(`   Error browsing qistbazaar.pk: ${e.message}`);
  }

  // 4. Pak-Electronics Browsing
  console.log("\n4. Browsing https://pak-electronics.pk/product-category/refrigerator/ ...");
  try {
    await page.goto('https://pak-electronics.pk/product-category/refrigerator/', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(2000);
    const pakItems = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('.product, .product-grid-item').forEach(el => {
        const titleEl = el.querySelector('.woocommerce-loop-product__title, a');
        const imgEl = el.querySelector('img');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
        if (title.toLowerCase().includes('haier') && imgSrc) arr.push({ title, imgSrc });
      });
      return arr;
    });
    console.log(`   Scraped ${pakItems.length} Haier products from pak-electronics.pk`);
    siteCatalogs['pak-electronics.pk'] = pakItems;
  } catch (e) {
    console.error(`   Error browsing pak-electronics.pk: ${e.message}`);
  }

  await browser.close();

  // Match items
  const resultsReport = [];
  const unmatchedRows = [];
  let foundCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < chunk1.length; idx++) {
    const item = chunk1[idx];
    const rawModel = item.model || '';
    const coreModel = getCoreModel(rawModel);
    const coreNum = getCoreNumber(rawModel);
    const title = toTitleCase(`Haier ${rawModel}`);

    let matchedSite = '';
    let matchedImgUrl = '';
    let matchNotes = '';

    // Search across 4 portals in order
    for (const [siteDomain, catalog] of Object.entries(siteCatalogs)) {
      if (matchedImgUrl) break;

      const found = catalog.find(sItem => {
        const siteTitleNorm = sItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const coreNumNorm = coreNum.replace(/[^0-9]/g, '');
        
        if (coreNumNorm && coreNumNorm.length >= 2) {
          if (siteTitleNorm.includes(coreNumNorm)) {
            return true;
          }
        }
        return false;
      });

      if (found) {
        matchedSite = siteDomain;
        matchedImgUrl = found.imgSrc;
        matchNotes = `Exact core number ${coreNum} matched on ${siteDomain}`;
      }
    }

    if (matchedImgUrl) {
      // Download direct image and insert product into DB
      const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localFilename = `${slug}.jpg`;
      const localAbsPath = path.join(imagesOutputDir, localFilename);
      const relativeWebPath = `/images/products/${localFilename}`;

      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${slug}.jpg`);
        const client = matchedImgUrl.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(matchedImgUrl, (resp) => {
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
        });

        if (fs.existsSync(tempRaw)) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 92 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRaw);
        }

        // Insert or Update product in DB ONLY AFTER MATCH CONFIRMED
        const priceNum = item.mrp || 60000;
        const discountPrice = Math.round(priceNum * 0.95);

        const [existing] = await db.query('SELECT id FROM products WHERE name = ?', [title]);

        if (existing.length > 0) {
          await db.execute('UPDATE products SET image = ?, price = ?, discountPrice = ? WHERE id = ?', [relativeWebPath, priceNum, discountPrice, existing[0].id]);
        } else {
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Refrigerators', 'Haier', priceNum, discountPrice, relativeWebPath, `Original Haier ${title}. Official warranty.`, 10]
          );
        }

        foundCount++;
        resultsReport.push({
          model: rawModel,
          category: "Refrigerators",
          source_website: matchedSite,
          image_status: "FOUND_AND_UPLOADED",
          match_notes: matchNotes
        });

      } catch (err) {
        notFoundCount++;
        resultsReport.push({
          model: rawModel,
          category: "Refrigerators",
          source_website: "NONE",
          image_status: "NOT_FOUND",
          match_notes: `Image download error: ${err.message}`
        });
        unmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
      }

    } else {
      notFoundCount++;
      const notes = `Core model ${coreNum || coreModel} not listed on target portals`;
      resultsReport.push({
        model: rawModel,
        category: "Refrigerators",
        source_website: "NONE",
        image_status: "NOT_FOUND",
        match_notes: notes
      });

      unmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
    }
  }

  // Update Haier_June26_Unmatched.csv
  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 CHUNK 1 EXECUTION REPORT (REFRIGERATORS — 50 PRODUCTS)");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ NOT_FOUND (Logged to Haier_June26_Unmatched.csv): ${notFoundCount}`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'ref_chunk1_report.json'), JSON.stringify(resultsReport, null, 2), 'utf8');
  await db.end();
  process.exit(0);
}

processHaierRefChunk1().catch(console.error);
