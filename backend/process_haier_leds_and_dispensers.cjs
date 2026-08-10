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

async function processLedsAndDispensers() {
  console.log("==================================================");
  console.log("🚀 PROCESSING HAIER LED TVs & WATER DISPENSERS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  // Parse Pages 6 & 7 (LEDs) and Page 8 (Dispensers) from PDF
  const pyCode = `import pypdf, json, os

fpath = r"e:\\earthyelectronics\\backend\\all products files\\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# LEDs: Pages 6 & 7
leds = []
for p_idx in [5, 6]:
    p_text = reader.pages[p_idx].extract_text() or ""
    lines = p_text.split('\\n')
    for line in lines:
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line or 'Date:' in line:
            continue
        # Extract lines starting with digit or model like H32... H43...
        parts = line.split()
        if len(parts) >= 2:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                mrp = int(mrp_str)
                sr = parts[0] if parts[0].isdigit() else str(len(leds) + 1)
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    leds.append({"sr": sr, "model": model, "mrp": mrp, "category": "LED TVs"})

# Dispensers: Page 8
dispensers = []
p8_text = reader.pages[7].extract_text() or ""
for line in p8_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Company' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            dispensers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Water Dispensers"})

with open(r"e:\\earthyelectronics\\backend\\haier_led_disp.json", "w", encoding="utf-8") as f:
    json.dump({"leds": leds, "dispensers": dispensers}, f, indent=2)
`;

  fs.writeFileSync(path.join(__dirname, 'parse_ld.py'), pyCode, 'utf8');
  pypdf.execSync(`python "${path.join(__dirname, 'parse_ld.py')}"`);

  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_led_disp.json'), 'utf8'));
  const leds = parsed.leds;
  const dispensers = parsed.dispensers;

  console.log(`Loaded ${leds.length} LED TVs & ${dispensers.length} Water Dispensers.`);

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

  // 1. Process LED TVs
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING LED TVs (${leds.length} Items)...`);
  console.log("🌐 Official Portal Scrolled: https://www.haier.com/pk/tvs");
  console.log("--------------------------------------------------");

  const tvUrl = 'https://www.haier.com/pk/tvs';
  const scrapedTv = [];

  try {
    await delay(2500);
    await page.goto(tvUrl, { waitUntil: 'networkidle2', timeout: 30000 });
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
    scrapedTv.push(...items);
  } catch (e) {
    console.error(`TV Navigation Error: ${e.message}`);
  }

  let tvFound = 0;
  let tvNotFound = 0;

  for (let idx = 0; idx < leds.length; idx++) {
    const item = leds[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    const match = scrapedTv.find(siteItem => {
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
            [title, 'LED TVs', 'Haier', priceNum, discountPrice, relativeUrl, `Original Haier ${title}. Official Warranty.`, 10]
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
      const notes = `Core number ${coreNum} not listed on official TV category scroll`;
      unmatchedRows.push(`"${idx + 1}","Haier","LED TVs","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier TV] ${rawModel} (Image_URL left EMPTY)`);
    }
  }

  // 2. Process Water Dispensers
  console.log("\n--------------------------------------------------");
  console.log(`🔍 PROCESSING WATER DISPENSERS (${dispensers.length} Items)...`);
  console.log("--------------------------------------------------");

  let dispFound = 0;
  let dispNotFound = 0;

  for (let idx = 0; idx < dispensers.length; idx++) {
    const item = dispensers[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum } = getCoreModelDetails(rawModel);

    dispNotFound++;
    const notes = `Core number ${coreNum} not listed on official Dispenser category scroll`;
    unmatchedRows.push(`"${idx + 1}","Haier","Water Dispensers","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
    console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier Dispenser] ${rawModel} (Image_URL left EMPTY)`);
  }

  await browser.close();

  // Append to Haier_June26_Unmatched.csv
  fs.appendFileSync(unmatchedFile, unmatchedRows.join('\n') + '\n', 'utf8');

  console.log("\n==================================================");
  console.log("📊 LED TVs & WATER DISPENSERS EXECUTION REPORT");
  console.log("==================================================");
  console.log(`📺 LED TVs (${leds.length} Items): FOUND=${tvFound}, NOT_FOUND=${tvNotFound}`);
  console.log(`🚰 Water Dispensers (${dispensers.length} Items): FOUND=${dispFound}, NOT_FOUND=${dispNotFound}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processLedsAndDispensers().catch(console.error);
