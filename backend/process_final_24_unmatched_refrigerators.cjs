const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function getCoreNumber(modelStr) {
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

  const numMatch = clean.match(/\d+/);
  return numMatch ? numMatch[0] : '';
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

async function processFinal24UnmatchedRef() {
  console.log("==================================================");
  console.log("🚀 PROCESSING FINAL 24 UNMATCHED HAIER REFRIGERATOR MODELS");
  console.log("📍 PORTALS (IN EXACT ORDER): 1. qistbazaar.pk  2. pak-electronics.pk");
  console.log("🔒 GOLDEN RULE: ZERO DB CREATION WITHOUT MATCHED IMAGE");
  console.log("==================================================");

  // Load remaining 24 unmatched models from pak_ref_chunk2_report.json
  const chunk2Report = JSON.parse(fs.readFileSync(path.join(__dirname, 'pak_ref_chunk2_report.json'), 'utf8'));
  const remaining24Models = chunk2Report.filter(r => r.image_status === 'NOT_FOUND');

  console.log(`Processing remaining ${remaining24Models.length} unmatched models...\n`);

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

  // 1. Scrape all QistBazaar pages
  const qistPages = [
    'https://www.qistbazaar.pk/product-category/refrigerator/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/2/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/3/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/4/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/5/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/6/'
  ];

  const qistCatalog = [];

  for (const qUrl of qistPages) {
    try {
      await page.goto(qUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(2000);

      const items = await page.evaluate(() => {
        const list = [];
        const links = document.querySelectorAll('a, h2, h3, .product-title, [class*="product-name"]');
        links.forEach(el => {
          const txt = el.textContent.trim().replace(/\s+/g, ' ');
          let img = el.querySelector('img') || el.parentElement?.querySelector('img') || el.closest('.product')?.querySelector('img');
          const imgSrc = img ? (img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src) : '';

          if (txt.length > 5 && imgSrc && !imgSrc.includes('logo')) {
            list.push({ title: txt, imgSrc });
          }
        });
        return list;
      });
      qistCatalog.push(...items);
    } catch (e) {}
  }

  // 2. Scrape all Pak-Electronics pages
  const pakPages = [
    'https://pak-electronics.pk/product-category/refrigerators/',
    'https://pak-electronics.pk/product-category/refrigerators/page/2/',
    'https://pak-electronics.pk/product-category/refrigerators/page/3/',
    'https://pak-electronics.pk/product-category/refrigerators/page/4/',
    'https://pak-electronics.pk/product-category/refrigerators/page/5/',
    'https://pak-electronics.pk/product-category/refrigerators/page/6/'
  ];

  const pakCatalog = [];

  for (const pUrl of pakPages) {
    try {
      await page.goto(pUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(2000);

      const items = await page.evaluate(() => {
        const list = [];
        const links = document.querySelectorAll('a[href*="/product/"], .product-title, h2, h3');
        links.forEach(el => {
          const txt = el.textContent.trim().replace(/\s+/g, ' ');
          let img = el.querySelector('img') || el.parentElement?.querySelector('img') || el.closest('.product')?.querySelector('img');
          const imgSrc = img ? (img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src) : '';

          if (txt.length > 5 && imgSrc && !imgSrc.includes('logo')) {
            list.push({ title: txt, imgSrc });
          }
        });
        return list;
      });
      pakCatalog.push(...items);
    } catch (e) {}
  }

  await browser.close();

  console.log(`QistBazaar Catalog Size: ${qistCatalog.length} products`);
  console.log(`Pak-Electronics Catalog Size: ${pakCatalog.length} products\n`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const finalReport = [];
  const stillUnmatchedRows = [];
  let foundCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < remaining24Models.length; idx++) {
    const item = remaining24Models[idx];
    const rawModel = item.model || '';
    const coreNum = getCoreNumber(rawModel);
    const title = toTitleCase(`Haier ${rawModel}`);

    let matchedItem = null;
    let matchedSite = '';

    if (coreNum && coreNum.length >= 2) {
      // Priority 1: qistbazaar.pk
      const qistMatch = qistCatalog.find(siteItem => {
        const siteTitleNorm = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const coreNumNorm = coreNum.replace(/[^0-9]/g, '');
        return siteTitleNorm.includes('HAIER') && siteTitleNorm.includes(coreNumNorm);
      });

      if (qistMatch) {
        matchedItem = qistMatch;
        matchedSite = 'https://www.qistbazaar.pk';
      } else {
        // Priority 2: pak-electronics.pk
        const pakMatch = pakCatalog.find(siteItem => {
          const siteTitleNorm = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const coreNumNorm = coreNum.replace(/[^0-9]/g, '');
          return siteTitleNorm.includes('HAIER') && siteTitleNorm.includes(coreNumNorm);
        });

        if (pakMatch) {
          matchedItem = pakMatch;
          matchedSite = 'https://pak-electronics.pk';
        }
      }
    }

    if (matchedItem && matchedItem.imgSrc) {
      const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localFilename = `${slug}.jpg`;
      const localAbsPath = path.join(imagesOutputDir, localFilename);
      const relativeWebPath = `/images/products/${localFilename}`;

      try {
        const tempRaw = path.join(imagesOutputDir, `temp_final_${slug}.jpg`);
        const client = matchedItem.imgSrc.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(matchedItem.imgSrc, (resp) => {
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

        const priceNum = item.mrp || 60000;
        const discountPrice = Math.round(priceNum * 0.95);

        // CREATE OR UPDATE DB RECORD ONLY WHEN MATCH IS CONFIRMED
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
        const notes = `Exact core number ${coreNum} matched on ${matchedSite} (${matchedItem.title})`;
        finalReport.push({
          s_no: idx + 1,
          model: rawModel,
          category: "Refrigerators",
          source_website: matchedSite,
          image_status: "FOUND_AND_UPLOADED",
          match_notes: notes
        });

      } catch (err) {
        notFoundCount++;
        finalReport.push({
          s_no: idx + 1,
          model: rawModel,
          category: "Refrigerators",
          source_website: "NONE",
          image_status: "NOT_FOUND",
          match_notes: `Image download error`
        });
        stillUnmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","","NOT_FOUND","Image download error"`);
      }

    } else {
      notFoundCount++;
      const notes = `Core model number ${coreNum} not listed on qistbazaar.pk or pak-electronics.pk`;
      finalReport.push({
        s_no: idx + 1,
        model: rawModel,
        category: "Refrigerators",
        source_website: "NONE",
        image_status: "NOT_FOUND",
        match_notes: notes
      });

      stillUnmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","","NOT_FOUND","${notes}"`);
    }
  }

  // Create final Haier_June26_Refrigerator_Still_Unmatched.csv
  const finalCsvFile = path.join(__dirname, 'product files', 'Haier_June26_Refrigerator_Still_Unmatched.csv');
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(finalCsvFile, uHeader + stillUnmatchedRows.join('\n'), 'utf8');

  // Save report JSON
  fs.writeFileSync(path.join(__dirname, 'haier_refrigerator_final_24_report.json'), JSON.stringify(finalReport, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("📊 FINAL HAIER REFRIGERATORS EXECUTION COMPLETE");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ STILL NOT_FOUND (Logged to Haier_June26_Refrigerator_Still_Unmatched.csv): ${notFoundCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processFinal24UnmatchedRef().catch(console.error);
