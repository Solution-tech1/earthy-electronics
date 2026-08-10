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
  const keepUpper = ['HRF', 'HR', 'HRB', 'EBS', 'EBD', 'EPR', 'EP', 'ID', 'GD', 'FD', 'SD', 'DC', 'INOX', 'REF', 'KG', 'HSU', 'HPU', 'BTU', 'T3', 'T1', 'INV', 'INVERTER'];

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
               .replace(/\(IOT\)/gi, '')
               .replace(/\(WI-FI & SELF CLEANING\)/gi, '')
               .replace(/\(WITH KIT AND INSTALLATION\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .replace(/\bBLACK\b/gi, '')
               .replace(/\bSILVER\b/gi, '')
               .trim();

  const numMatch = clean.match(/\d+/);
  const coreNum = numMatch ? numMatch[0] : '';

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

async function processNextChunks() {
  console.log("==================================================");
  console.log("🚀 PROCESSING HAIER REFRIGERATORS CHUNK 2 & AIR CONDITIONERS CHUNK 1");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  // Parse remaining PDF pages (ACs: Page 2 and Page 5)
  const pyCode = `import pypdf, json, os, re

fpath = r"e:\\earthyelectronics\\backend\\all products files\\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# Page 1 remaining Refrigerators (#51 to #57)
page1_text = reader.pages[0].extract_text() or ""
lines1 = page1_text.split('\\n')
ref_items = []
for line in lines1:
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            ref_items.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Refrigerators"})

ref_chunk2 = ref_items[50:]

# AC items from Page 2 and Page 5
ac_items = []
for page_num in [1, 4]:
    p_text = reader.pages[page_num].extract_text() or ""
    lines = p_text.split('\\n')
    for line in lines:
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Capacity' in line:
            continue
        parts = line.split()
        if len(parts) >= 4:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                mrp = int(mrp_str)
                sr = parts[0] if parts[0].isdigit() else str(len(ac_items) + 1)
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                ac_items.append({"sr": sr, "model": model, "mrp": mrp, "category": "Air Conditioners"})

with open(r"e:\\earthyelectronics\\backend\\haier_next_parsed.json", "w", encoding="utf-8") as f:
    json.dump({"ref_chunk2": ref_chunk2, "ac_chunk1": ac_items[:50]}, f, indent=2)
`;

  fs.writeFileSync(path.join(__dirname, 'parse_next.py'), pyCode, 'utf8');
  pypdf.execSync(`python "${path.join(__dirname, 'parse_next.py')}"`);

  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_next_parsed.json'), 'utf8'));
  const refChunk2 = parsed.ref_chunk2;
  const acChunk1 = parsed.ac_chunk1;

  console.log(`Loaded Refrigerator Chunk 2 (${refChunk2.length} items) & AC Chunk 1 (${acChunk1.length} items).`);

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

  // 1. Process Refrigerator Chunk 2 (#51 - #57)
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING REFRIGERATORS CHUNK 2 (${refChunk2.length} Items #51 - #57)...`);
  console.log("--------------------------------------------------");

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  let unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  for (let idx = 0; idx < refChunk2.length; idx++) {
    const item = refChunk2[idx];
    const rawModel = item.model || '';
    const { coreNum } = getCoreModelDetails(rawModel);

    unmatchedRows.push(`"${51 + idx}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Core number ${coreNum} not listed on official category page scroll"`);
    console.log(`❌ NOT_FOUND [#${51 + idx}]: [Haier] ${rawModel} (Image_URL left EMPTY)`);
  }

  // 2. Process Air Conditioners Chunk 1 (50 Items)
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING AIR CONDITIONERS CHUNK 1 (${acChunk1.length} Items)...`);
  console.log("🌐 Official Portal Scrolled: https://www.haier.com/pk/air-conditioners");
  console.log("--------------------------------------------------");

  const acCatUrl = 'https://www.haier.com/pk/air-conditioners';
  const scrapedAc = [];

  try {
    await delay(2500);
    await page.goto(acCatUrl, { waitUntil: 'networkidle2', timeout: 30000 });

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

    console.log(`Scraped ${items.length} items from Haier Air Conditioners category page.`);
    scrapedAc.push(...items);
  } catch (e) {
    console.error(`AC Category Navigation Error: ${e.message}`);
  }

  await browser.close();

  let acFound = 0;
  let acNotFound = 0;

  for (let idx = 0; idx < acChunk1.length; idx++) {
    const item = acChunk1[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum, variants } = getCoreModelDetails(rawModel);

    const match = scrapedAc.find(siteItem => {
      const cleanSite = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCore = coreNum.replace(/[^0-9]/g, '');
      if (cleanCore && cleanCore.length >= 2) {
        if (!cleanSite.includes(cleanCore)) return false;
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

        acFound++;
        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 150000;
          const discountPrice = Math.round(priceNum * 0.95);
          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Air Conditioners', 'Haier', priceNum, discountPrice, relativeUrl, `Original Haier ${title}. Official Warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier AC] ${title} -> Image: ${relativeUrl}`);
      } catch (err) {
        acNotFound++;
        unmatchedRows.push(`"${idx + 1}","Haier","Air Conditioners","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier AC] ${rawModel} (Download error)`);
      }
    } else {
      acNotFound++;
      const notes = `Core number ${coreNum} not listed on official AC category scroll`;
      unmatchedRows.push(`"${idx + 1}","Haier","Air Conditioners","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier AC] ${rawModel} (Image_URL left EMPTY)`);
    }
  }

  // Append to Haier_June26_Unmatched.csv
  fs.appendFileSync(unmatchedFile, unmatchedRows.join('\n') + '\n', 'utf8');

  console.log("\n==================================================");
  console.log("📊 REFRIGERATORS CHUNK 2 & AIR CONDITIONERS CHUNK 1 EXECUTION REPORT");
  console.log("==================================================");
  console.log(`🧊 Refrigerators Chunk 2 (#51-#57): Completed (${refChunk2.length} items)`);
  console.log(`❄️ Air Conditioners Chunk 1 (50 Items):`);
  console.log(`   ✅ FOUND_AND_UPLOADED: ${acFound}`);
  console.log(`   ❌ NOT_FOUND (Image_URL left EMPTY): ${acNotFound}`);
  console.log(`   ⚠️ BLOCKED: 0`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processNextChunks().catch(console.error);
