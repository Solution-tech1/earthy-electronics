const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
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

async function processHaierRefChunk1Strict() {
  console.log("==================================================");
  console.log("🚀 CATEGORY 1: REFRIGERATORS CHUNK 1 (50 PRODUCTS)");
  console.log("🔒 STRICT GOLDEN RULE: ZERO DB ENTRY WITHOUT MATCHED IMAGE");
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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const chunkReport = [];
  const unmatchedRows = [];

  let foundCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < chunk1.length; idx++) {
    const item = chunk1[idx];
    const rawModel = item.model || '';
    const coreNum = getCoreNumber(rawModel);
    const title = `Haier ${rawModel}`;

    let matchedSite = '';
    let matchedImgUrl = '';
    let matchNotes = '';

    console.log(`[${idx+1}/50] Checking: "${rawModel}" (Core Number: ${coreNum})...`);

    // Target portals in exact specified order:
    // 1. haier.com/pk
    // 2. ishopping.pk
    // 3. qistbazaar.pk
    // 4. pak-electronics.pk

    if (coreNum && coreNum.length >= 2) {
      // 1. haier.com/pk
      try {
        const hUrl = `https://www.haier.com/pk/search/?q=${encodeURIComponent(coreNum)}`;
        await page.goto(hUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await delay(1200);

        const hMatch = await page.evaluate((cNum) => {
          const imgs = Array.from(document.querySelectorAll('img'));
          for (const img of imgs) {
            const alt = (img.getAttribute('alt') || '').toUpperCase();
            const src = img.getAttribute('data-src') || img.src || '';
            if (alt.includes(cNum) && src && src.startsWith('http')) {
              return { title: alt, imgSrc: src };
            }
          }
          return null;
        }, coreNum);

        if (hMatch && hMatch.imgSrc) {
          matchedSite = 'https://www.haier.com/pk';
          matchedImgUrl = hMatch.imgSrc;
          matchNotes = `Exact core number ${coreNum} matched on haier.com/pk`;
        }
      } catch (e) {}

      // 2. ishopping.pk
      if (!matchedImgUrl) {
        try {
          const iUrl = `https://www.ishopping.pk/catalogsearch/result/?q=Haier+${encodeURIComponent(coreNum)}`;
          await page.goto(iUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          await delay(1200);

          const iMatch = await page.evaluate((cNum) => {
            const items = document.querySelectorAll('.product-item, .item');
            for (const el of items) {
              const t = el.textContent.toUpperCase();
              const img = el.querySelector('img');
              const src = img ? (img.getAttribute('data-src') || img.src) : '';
              if (t.includes('HAIER') && t.includes(cNum) && src && src.startsWith('http')) {
                return { imgSrc: src };
              }
            }
            return null;
          }, coreNum);

          if (iMatch && iMatch.imgSrc) {
            matchedSite = 'https://ishopping.pk';
            matchedImgUrl = iMatch.imgSrc;
            matchNotes = `Exact core number ${coreNum} matched on ishopping.pk`;
          }
        } catch (e) {}
      }

      // 3. qistbazaar.pk
      if (!matchedImgUrl) {
        try {
          const qUrl = `https://www.qistbazaar.pk/?s=Haier+${encodeURIComponent(coreNum)}&post_type=product`;
          await page.goto(qUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          await delay(1200);

          const qMatch = await page.evaluate((cNum) => {
            const items = document.querySelectorAll('.product, .product-grid-item');
            for (const el of items) {
              const t = el.textContent.toUpperCase();
              const img = el.querySelector('img');
              const src = img ? (img.getAttribute('data-src') || img.src) : '';
              if (t.includes('HAIER') && t.includes(cNum) && src && src.startsWith('http')) {
                return { imgSrc: src };
              }
            }
            return null;
          }, coreNum);

          if (qMatch && qMatch.imgSrc) {
            matchedSite = 'https://qistbazaar.pk';
            matchedImgUrl = qMatch.imgSrc;
            matchNotes = `Exact core number ${coreNum} matched on qistbazaar.pk`;
          }
        } catch (e) {}
      }

      // 4. pak-electronics.pk
      if (!matchedImgUrl) {
        try {
          const pUrl = `https://pak-electronics.pk/?s=Haier+${encodeURIComponent(coreNum)}&post_type=product`;
          await page.goto(pUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          await delay(1200);

          const pMatch = await page.evaluate((cNum) => {
            const items = document.querySelectorAll('.product, .product-grid-item');
            for (const el of items) {
              const t = el.textContent.toUpperCase();
              const img = el.querySelector('img');
              const src = img ? (img.getAttribute('data-src') || img.src) : '';
              if (t.includes('HAIER') && t.includes(cNum) && src && src.startsWith('http')) {
                return { imgSrc: src };
              }
            }
            return null;
          }, coreNum);

          if (pMatch && pMatch.imgSrc) {
            matchedSite = 'https://pak-electronics.pk';
            matchedImgUrl = pMatch.imgSrc;
            matchNotes = `Exact core number ${coreNum} matched on pak-electronics.pk`;
          }
        } catch (e) {}
      }
    }

    if (matchedImgUrl) {
      // DOWNLOAD DIRECT IMAGE AND INSERT PRODUCT INTO DB ONLY AFTER MATCH CONFIRMED
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

        // DB Creation / Update ONLY IF MATCH CONFIRMED
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
      const notes = `Core model number ${coreNum} not listed on target portals`;
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

  await browser.close();

  // Save Haier_June26_Unmatched.csv
  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  // Save report json
  fs.writeFileSync(path.join(__dirname, 'ref_chunk1_report.json'), JSON.stringify(chunkReport, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("📊 CHUNK 1 EXECUTION REPORT (REFRIGERATORS — 50 PRODUCTS)");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ NOT_FOUND (Logged to Haier_June26_Unmatched.csv): ${notFoundCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processHaierRefChunk1Strict().catch(console.error);
