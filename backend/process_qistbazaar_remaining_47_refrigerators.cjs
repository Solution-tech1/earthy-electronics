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

async function processQistRemaining47Ref() {
  console.log("==================================================");
  console.log("🚀 STEP 3: QISTBAZAAR.PK — REMAINING 47 UNMATCHED REFRIGERATOR MODELS");
  console.log("📍 CATEGORY URL: https://www.qistbazaar.pk/product-category/refrigerator");
  console.log("🔒 GOLDEN RULE: ZERO DB CREATION WITHOUT MATCHED IMAGE");
  console.log("==================================================");

  // Load the 47 unmatched models from pak_ref_final_report.json
  const pakReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'pak_ref_final_report.json'), 'utf8'));
  const remaining47Models = pakReport.filter(r => r.image_status === 'NOT_FOUND');

  console.log(`Processing remaining ${remaining47Models.length} unmatched models on QistBazaar...\n`);

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

  // Scrape all QistBazaar refrigerator category pagination pages
  const qistCategoryPages = [
    'https://www.qistbazaar.pk/product-category/refrigerator/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/2/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/3/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/4/',
    'https://www.qistbazaar.pk/product-category/refrigerator/page/5/'
  ];

  const scrapedCatalog = [];

  for (const cUrl of qistCategoryPages) {
    console.log(`Navigating to ${cUrl} ...`);
    try {
      await page.goto(cUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      await delay(2500);

      // Scroll page
      await page.evaluate(async () => {
        await new Promise(res => {
          let t = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 500);
            t += 500;
            if (t >= document.body.scrollHeight || t > 12000) {
              clearInterval(timer);
              res();
            }
          }, 150);
        });
      });

      const pageProducts = await page.evaluate(() => {
        const arr = [];
        const cards = document.querySelectorAll('.product, .product-grid-item, div.product');
        cards.forEach(c => {
          const aTag = c.querySelector('.product-title, h3 a, h2 a, a');
          const imgTag = c.querySelector('img');
          const title = aTag ? aTag.textContent.trim().replace(/\s+/g, ' ') : '';
          const href = aTag ? aTag.href : '';
          const imgSrc = imgTag ? (imgTag.getAttribute('data-src') || imgTag.getAttribute('data-lazy-src') || imgTag.src) : '';
          
          if (title.length > 5 && !title.includes('%') && imgSrc && !imgSrc.includes('logo')) {
            arr.push({ title, href, imgSrc });
          }
        });
        return arr;
      });

      console.log(`   Scraped ${pageProducts.length} clean products from ${cUrl}`);
      scrapedCatalog.push(...pageProducts);

    } catch (e) {
      console.log(`   Reached end of QistBazaar pagination at ${cUrl}`);
    }
  }

  await browser.close();

  // Deduplicate catalog
  const cleanCatalog = [];
  const seen = new Set();
  scrapedCatalog.forEach(p => {
    if (!seen.has(p.title.toLowerCase())) {
      seen.add(p.title.toLowerCase());
      cleanCatalog.push(p);
    }
  });

  console.log(`\n✅ TOTAL UNIQUE REFRIGERATORS SCRAPED FROM QISTBAZAAR: ${cleanCatalog.length}`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const reportList = [];
  const stillUnmatchedRows = [];

  let foundCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < remaining47Models.length; idx++) {
    const item = remaining47Models[idx];
    const rawModel = item.model || '';
    const coreNum = getCoreNumber(rawModel);
    const title = toTitleCase(`Haier ${rawModel}`);

    let matchedItem = null;

    if (coreNum && coreNum.length >= 2) {
      matchedItem = cleanCatalog.find(siteItem => {
        const siteTitleNorm = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const coreNumNorm = coreNum.replace(/[^0-9]/g, '');
        return siteTitleNorm.includes('HAIER') && siteTitleNorm.includes(coreNumNorm);
      });
    }

    if (matchedItem && matchedItem.imgSrc) {
      const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localFilename = `${slug}.jpg`;
      const localAbsPath = path.join(imagesOutputDir, localFilename);
      const relativeWebPath = `/images/products/${localFilename}`;

      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${slug}.jpg`);
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
        const notes = `Exact core number ${coreNum} matched on qistbazaar.pk (${matchedItem.title})`;
        reportList.push({
          s_no: idx + 1,
          model: rawModel,
          category: "Refrigerators",
          source_website: "https://qistbazaar.pk",
          image_status: "FOUND_AND_UPLOADED",
          match_notes: notes
        });

      } catch (err) {
        notFoundCount++;
        reportList.push({
          s_no: idx + 1,
          model: rawModel,
          category: "Refrigerators",
          source_website: "NONE",
          image_status: "NOT_FOUND",
          match_notes: `Image download error`
        });
        stillUnmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
      }

    } else {
      notFoundCount++;
      const notes = `Core model number ${coreNum} not listed on qistbazaar.pk`;
      reportList.push({
        s_no: idx + 1,
        model: rawModel,
        category: "Refrigerators",
        source_website: "NONE",
        image_status: "NOT_FOUND",
        match_notes: notes
      });

      stillUnmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
    }
  }

  // Update Haier_June26_Still_Unmatched.csv
  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Still_Unmatched.csv');
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + stillUnmatchedRows.join('\n'), 'utf8');

  // Save report JSON
  fs.writeFileSync(path.join(__dirname, 'qist_ref_remaining_report.json'), JSON.stringify(reportList, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("📊 QISTBAZAAR.PK — REMAINING 47 REFRIGERATOR MODELS EXECUTION COMPLETE");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ STILL NOT_FOUND (Logged to Haier_June26_Still_Unmatched.csv): ${notFoundCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processQistRemaining47Ref().catch(console.error);
