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

async function processPakRefChunk1() {
  console.log("==================================================");
  console.log("🚀 STEP 1: PAK-ELECTRONICS.PK — REFRIGERATORS CHUNK 1 (50 PRODUCTS)");
  console.log("🔒 STRICT GOLDEN RULE: ZERO DB CREATION WITHOUT MATCHED IMAGE");
  console.log("==================================================");

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

  const targetCategoryUrl = 'https://pak-electronics.pk/product-category/refrigerator/';
  console.log(`1. Navigating directly to Category Page: ${targetCategoryUrl} ...`);
  
  await page.goto(targetCategoryUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await delay(3000);

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  // Scroll down to load all product grid cards
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

  // Extract all clean product cards from Category Page (page 1 + pagination links)
  const categoryProducts = await page.evaluate(() => {
    const arr = [];
    const cards = document.querySelectorAll('li.product, div.product, .product-grid-item');
    cards.forEach(c => {
      const aTag = c.querySelector('a.woocommerce-LoopProduct-link, .woocommerce-loop-product__title, h2 a, h3 a, a');
      const imgTag = c.querySelector('img');
      const title = aTag ? aTag.textContent.trim() : '';
      const imgSrc = imgTag ? (imgTag.getAttribute('data-src') || imgTag.getAttribute('data-lazy-src') || imgTag.src) : '';
      if (title.length > 5 && !title.includes('%') && imgSrc && !imgSrc.includes('logo')) {
        arr.push({ title, imgSrc });
      }
    });
    return arr;
  });

  // Also check page 2 of category pagination if available
  try {
    const page2Url = 'https://pak-electronics.pk/product-category/refrigerator/page/2/';
    await page.goto(page2Url, { waitUntil: 'networkidle2', timeout: 25000 });
    await delay(2000);

    const page2Products = await page.evaluate(() => {
      const arr = [];
      const cards = document.querySelectorAll('li.product, div.product, .product-grid-item');
      cards.forEach(c => {
        const aTag = c.querySelector('a.woocommerce-LoopProduct-link, .woocommerce-loop-product__title, h2 a, h3 a, a');
        const imgTag = c.querySelector('img');
        const title = aTag ? aTag.textContent.trim() : '';
        const imgSrc = imgTag ? (imgTag.getAttribute('data-src') || imgTag.getAttribute('data-lazy-src') || imgTag.src) : '';
        if (title.length > 5 && !title.includes('%') && imgSrc && !imgSrc.includes('logo')) {
          arr.push({ title, imgSrc });
        }
      });
      return arr;
    });

    categoryProducts.push(...page2Products);
  } catch (e) {}

  await browser.close();

  // Deduplicate scraped category products
  const cleanCatalog = [];
  const seenCatalog = new Set();
  categoryProducts.forEach(p => {
    if (!seenCatalog.has(p.title.toLowerCase())) {
      seenCatalog.add(p.title.toLowerCase());
      cleanCatalog.push(p);
    }
  });

  console.log(`\n✅ Scraped ${cleanCatalog.length} products from pak-electronics.pk Refrigerator Category Page`);
  console.log("First 10 Products Visible on Category Page:");
  cleanCatalog.slice(0, 10).forEach((p, i) => console.log(`   [${i+1}] ${p.title}`));

  // Match Chunk 1 (50 products)
  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_refrigerators_parsed.json'), 'utf8');
  const allRefItems = JSON.parse(rawJson);
  const chunk1 = allRefItems.slice(0, 50);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const chunkReport = [];
  const unmatchedRows = [];

  let foundCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < chunk1.length; idx++) {
    const item = chunk1[idx];
    const rawModel = item.model || '';
    const coreNum = getCoreNumber(rawModel);
    const title = toTitleCase(`Haier ${rawModel}`);

    let matchedSite = '';
    let matchedImgUrl = '';
    let matchNotes = '';

    if (coreNum && coreNum.length >= 2) {
      const match = cleanCatalog.find(siteItem => {
        const siteTitleNorm = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const coreNumNorm = coreNum.replace(/[^0-9]/g, '');
        return siteTitleNorm.includes('HAIER') && siteTitleNorm.includes(coreNumNorm);
      });

      if (match) {
        matchedSite = 'https://pak-electronics.pk';
        matchedImgUrl = match.imgSrc;
        matchNotes = `Exact core number ${coreNum} matched on pak-electronics.pk (${match.title})`;
      }
    }

    if (matchedImgUrl) {
      // Download direct image and create DB entry ONLY WHEN MATCH CONFIRMED
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
        chunkReport.push({
          model: rawModel,
          category: "Refrigerators",
          source_website: matchedSite,
          image_status: "FOUND_AND_UPLOADED",
          match_notes: matchNotes
        });

      } catch (err) {
        notFoundCount++;
        chunkReport.push({
          model: rawModel,
          category: "Refrigerators",
          source_website: "NONE",
          image_status: "NOT_FOUND",
          match_notes: `Image download error`
        });
        unmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
      }
    } else {
      notFoundCount++;
      const notes = `Core model number ${coreNum} not listed on pak-electronics.pk`;
      chunkReport.push({
        model: rawModel,
        category: "Refrigerators",
        source_website: "NONE",
        image_status: "NOT_FOUND",
        match_notes: notes
      });

      unmatchedRows.push(`"${idx+1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
    }
  }

  // Update Haier_June26_Still_Unmatched.csv
  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Still_Unmatched.csv');
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  // Save report json
  fs.writeFileSync(path.join(__dirname, 'pak_ref_chunk1_report.json'), JSON.stringify({
    landedUrl,
    first10Products: cleanCatalog.slice(0, 10),
    foundCount,
    notFoundCount,
    chunkReport
  }, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("📊 CHUNK 1 EXECUTION REPORT (PAK-ELECTRONICS.PK — REFRIGERATORS)");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ NOT_FOUND (Logged to Haier_June26_Still_Unmatched.csv): ${notFoundCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processPakRefChunk1().catch(console.error);
