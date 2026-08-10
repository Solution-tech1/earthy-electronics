const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const pypdf = require('child_process');

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

async function processWashersAndFreezers() {
  console.log("==================================================");
  console.log("🚀 PROCESSING HAIER WASHING MACHINES & DEEP FREEZERS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  // Parse Page 3 (Washers) and Page 4 (Freezers) from PDF
  const pyCode = `import pypdf, json, os

fpath = r"e:\\earthyelectronics\\backend\\all products files\\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# Washers: Page 3
washers = []
p3_text = reader.pages[2].extract_text() or ""
for line in p3_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            washers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Washing Machines"})

# Freezers: Page 4
freezers = []
p4_text = reader.pages[3].extract_text() or ""
for line in p4_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            freezers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Deep Freezers"})

with open(r"e:\\earthyelectronics\\backend\\haier_wash_freez.json", "w", encoding="utf-8") as f:
    json.dump({"washers": washers, "freezers": freezers}, f, indent=2)
`;

  fs.writeFileSync(path.join(__dirname, 'parse_wf.py'), pyCode, 'utf8');
  pypdf.execSync(`python "${path.join(__dirname, 'parse_wf.py')}"`);

  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_wash_freez.json'), 'utf8'));
  const washers = parsed.washers;
  const freezers = parsed.freezers;

  console.log(`Loaded ${washers.length} Washing Machines & ${freezers.length} Deep Freezers.`);

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

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  let unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  // 1. Process Washing Machines
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING WASHING MACHINES (${washers.length} Items)...`);
  console.log("🌐 Official Portal Scrolled: https://www.haier.com/pk/washing-machines");
  console.log("--------------------------------------------------");

  const wmUrl = 'https://www.haier.com/pk/washing-machines';
  const scrapedWm = [];

  try {
    await delay(2500);
    await page.goto(wmUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 15000) {
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
        if (title.length > 3 && imgSrc) results.push({ title, imgSrc });
      });
      return results;
    });
    scrapedWm.push(...items);
  } catch (e) {
    console.error(`WM Navigation Error: ${e.message}`);
  }

  let wmFound = 0;
  let wmNotFound = 0;

  for (let idx = 0; idx < washers.length; idx++) {
    const item = washers[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    const match = scrapedWm.find(siteItem => {
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
            [title, 'Washing Machines', 'Haier', priceNum, discountPrice, relativeUrl, `Original Haier ${title}. Official Warranty.`, 10]
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
      const notes = `Core number ${coreNum} not listed on official WM category scroll`;
      unmatchedRows.push(`"${idx + 1}","Haier","Washing Machines","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier WM] ${rawModel} (Image_URL left EMPTY)`);
    }
  }

  // 2. Process Deep Freezers
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING DEEP FREEZERS (${freezers.length} Items)...`);
  console.log("🌐 Official Portal Scrolled: https://www.haier.com/pk/freezers");
  console.log("--------------------------------------------------");

  const dfUrl = 'https://www.haier.com/pk/freezers';
  const scrapedDf = [];

  try {
    await delay(2500);
    await page.goto(dfUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 15000) {
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
        if (title.length > 3 && imgSrc) results.push({ title, imgSrc });
      });
      return results;
    });
    scrapedDf.push(...items);
  } catch (e) {
    console.error(`Freezer Navigation Error: ${e.message}`);
  }

  await browser.close();

  let dfFound = 0;
  let dfNotFound = 0;

  for (let idx = 0; idx < freezers.length; idx++) {
    const item = freezers[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    const match = scrapedDf.find(siteItem => {
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
            [title, 'Deep Freezers', 'Haier', priceNum, discountPrice, relativeUrl, `Original Haier ${title}. Official Warranty.`, 10]
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
      const notes = `Core number ${coreNum} not listed on official Freezer category scroll`;
      unmatchedRows.push(`"${idx + 1}","Haier","Deep Freezers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Freezer] ${rawModel} (Image_URL left EMPTY)`);
    }
  }

  // Append to Haier_June26_Unmatched.csv
  fs.appendFileSync(unmatchedFile, unmatchedRows.join('\n') + '\n', 'utf8');

  console.log("\n==================================================");
  console.log("📊 WASHING MACHINES & DEEP FREEZERS EXECUTION REPORT");
  console.log("==================================================");
  console.log(`🧺 Washing Machines (${washers.length} Items): FOUND=${wmFound}, NOT_FOUND=${wmNotFound}`);
  console.log(`🧊 Deep Freezers (${freezers.length} Items): FOUND=${dfFound}, NOT_FOUND=${dfNotFound}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processWashersAndFreezers().catch(console.error);
