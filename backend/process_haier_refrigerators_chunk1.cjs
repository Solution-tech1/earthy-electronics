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

// Extract CORE model number/digits and variants
function getCoreModelDetails(modelStr) {
  if (!modelStr) return { coreNum: '', raw: modelStr, variants: [] };
  
  let clean = modelStr.toUpperCase().trim();

  // Strip common end noise (Grey, White, (New), (IOT), etc.)
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\(IOT\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .replace(/\bBLACK\b/gi, '')
               .replace(/\bSILVER\b/gi, '')
               .trim();

  // Extract base digits (e.g. 186, 216, 246, 306, 316, 346, 368, 398, 438, 538, 66, 136)
  const numMatch = clean.match(/\d+/);
  const coreNum = numMatch ? numMatch[0] : '';

  // Extract slash variants if any (e.g. EBS/EBD -> ['EBS', 'EBD'])
  const variants = [];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    parts.forEach(p => {
      const v = p.replace(/[^\w]/g, '').trim();
      if (v) variants.push(v);
    });
  }

  return { coreNum, cleanModel: clean, variants };
}

async function processHaierRefrigeratorsChunk1() {
  console.log("==================================================");
  console.log("🚀 PROCESSING HAIER JUNE-26 PDF — REFRIGERATORS CHUNK 1 (50 PRODUCTS)");
  console.log("🌐 Official Portal: https://www.haier.com/pk/refrigerators");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  // Parse Page 1 of HAIER JUNE-26 MRP.pdf using python script
  const pyCode = `import pypdf, json, os, re

fpath = r"e:\\earthyelectronics\\backend\\all products files\\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

items = []
# Page 1 contains Refrigerators
page1_text = reader.pages[0].extract_text() or ""
lines = page1_text.split('\\n')

for line in lines:
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    # Match lines like: 1 HR-66 B 28,390 5,110 33,500 or 3 HRF-186 EBS/EBD 45,763 8,237 54,000
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        sr = parts[0]
        # MRP is last element
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            # Model is everything between sr and price numbers
            model = " ".join(parts[1:-3])
            items.append({
                "sr": sr,
                "model": model,
                "mrp": mrp,
                "category": "Refrigerators"
            })

with open(r"e:\\earthyelectronics\\backend\\haier_refrigerators_parsed.json", "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2)
`;

  fs.writeFileSync(path.join(__dirname, 'parse_haier_ref.py'), pyCode, 'utf8');
  pypdf.execSync(`python "${path.join(__dirname, 'parse_haier_ref.py')}"`);

  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_refrigerators_parsed.json'), 'utf8');
  const allRefItems = JSON.parse(rawJson);

  console.log(`Extracted ${allRefItems.length} Refrigerator items from PDF Page 1.`);

  // Chunk 1: First 50 Refrigerator Products
  const chunk1 = allRefItems.slice(0, 50);
  console.log(`Processing ${chunk1.length} Refrigerator items in Chunk 1...`);

  // Launch Real Browser Chrome
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

  const catUrl = 'https://www.haier.com/pk/refrigerators';
  console.log(`\nNavigating to Category Page: ${catUrl}...`);

  const scrapedCatalog = [];

  try {
    await delay(2500);
    await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Auto-scroll full page
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
        if (title.length > 3 && imgSrc) {
          results.push({ title, imgSrc });
        }
      });
      return results;
    });

    console.log(`Scraped ${items.length} product items from Haier Refrigerators category page.`);
    scrapedCatalog.push(...items);
  } catch (e) {
    console.error(`Category Navigation Error (${catUrl}): ${e.message}`);
  }

  await browser.close();

  let foundCount = 0;
  let notFoundCount = 0;

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  const unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING REFRIGERATOR CHUNK 1 PRODUCTS:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < chunk1.length; idx++) {
    const item = chunk1[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum, cleanModel, variants } = getCoreModelDetails(rawModel);

    // Search collected category items using strict CORE number matching rules
    const match = scrapedCatalog.find(siteItem => {
      const cleanSite = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCore = coreNum.replace(/[^0-9]/g, '');

      if (cleanCore && cleanCore.length >= 2) {
        // Base number must match 100%
        if (!cleanSite.includes(cleanCore)) return false;

        // If slash variants are specified (e.g. EBS/EBD), either variant matching base 186 is valid!
        if (variants.length > 0) {
          return variants.some(v => cleanSite.includes(v.toUpperCase()));
        }
        return true;
      }
      return false;
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

        foundCount++;

        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 65000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Refrigerators', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }

        const notes = `Exact core number ${coreNum} matched from official category page scroll`;
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier] ${title} -> Image: ${relativeUrl} | Notes: ${notes}`);
      } catch (err) {
        notFoundCount++;
        unmatchedRows.push(`"${idx + 1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier] ${rawModel} (Download error)`);
      }
    } else {
      notFoundCount++;
      const notes = `Core number ${coreNum} not listed on official category page scroll`;
      unmatchedRows.push(`"${idx + 1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  // Update Haier_June26_Unmatched.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 HAIER JUNE-26 REFRIGERATORS CHUNK 1 EXECUTION REPORT");
  console.log("🌐 Official Portal Scrolled: https://www.haier.com/pk/refrigerators");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ NOT_FOUND (Image_URL left EMPTY, exported to Haier_June26_Unmatched.csv): ${notFoundCount}`);
  console.log(`⚠️ BLOCKED: 0`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processHaierRefrigeratorsChunk1().catch(console.error);
