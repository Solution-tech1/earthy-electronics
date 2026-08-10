const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeCategory(cat, name = '') {
  cat = (cat || '').toLowerCase().trim();
  name = (name || '').toLowerCase().trim();

  if (cat === 'ac' || name.includes('ac') || name.includes('inverter') || name.includes('air conditioner')) return 'Air Conditioners';
  if (cat.includes('wm') || cat.includes('wash') || name.includes('washer') || name.includes('washing')) return 'Washing Machines';
  if (cat.includes('ref') || cat.includes('fridge') || name.includes('refriger')) return 'Refrigerators';
  if (cat.includes('led') || cat.includes('tv') || name.includes('tv') || name.includes('screen')) return 'LED TVs';
  if (cat.includes('m-w') || cat.includes('micro') || name.includes('microwave') || name.includes('oven')) return 'Microwave Ovens';
  if (cat.includes('w-d') || cat.includes('dispen') || name.includes('dispenser')) return 'Water Dispensers';
  if (cat.includes('geyser') || name.includes('geyser') || name.includes('water heater')) return 'Geysers & Water Heaters';
  if (cat.includes('freezer') || name.includes('freezer')) return 'Deep Freezers';
  return 'Kitchen Appliances';
}

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD', 'HGL', 'HMO'];

  return str
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/-by electronics world/gi, '')
    .replace(/by electronics world/gi, '')
    .replace(/-be-on installments/gi, '')
    .replace(/only for karachi/gi, '')
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

async function processRealBrowserHaier() {
  console.log("==================================================");
  console.log("🚀 STARTING REAL BROWSER PROCESSOR — BRAND 1 (HAIER - 9 PRODUCTS)");
  console.log("🌐 Official Portal: https://www.haier.com/pk");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const sourceFile = path.join(__dirname, 'product files', 'CDN_Unverified.csv');
  const stillUnverifiedFile = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');

  const rows = [];

  if (fs.existsSync(sourceFile)) {
    await new Promise(resolve => {
      fs.createReadStream(sourceFile)
        .pipe(csv())
        .on('data', d => rows.push(d))
        .on('end', resolve);
    });
  }

  // Items 24 to 32 (Haier 9 products)
  const remaining50 = rows.slice(23);
  const haierRows = remaining50.filter(r => (r.Brand || '').toLowerCase().includes('haier'));

  console.log(`Loaded ${haierRows.length} Haier products for Real Browser inspection...`);

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

  let verifiedOkCount = 0;
  let fixedAndUploadedCount = 0;
  let stillUnverifiedCount = 0;
  let blockedCount = 0;

  const stillUnverifiedEntries = [];
  if (fs.existsSync(stillUnverifiedFile)) {
    const lines = fs.readFileSync(stillUnverifiedFile, 'utf8').trim().split('\n').slice(1);
    stillUnverifiedEntries.push(...lines);
  }

  for (let idx = 0; idx < haierRows.length; idx++) {
    const r = haierRows[idx];
    const currentUrl = r.Image_URL || '';
    const modelName = r.Model_Name || '';

    console.log(`\n[#${idx + 1}/9] Inspecting: Haier ${modelName}`);

    // Step 1: 2-3 sec safety delay
    await delay(2500);

    let currentUrlOk = false;
    let captchaDetected = false;

    if (currentUrl && currentUrl.startsWith('http')) {
      try {
        const res = await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 12000 });
        const status = res.status();
        const bodyText = await page.content();

        if (bodyText.toLowerCase().includes('verify you are human') || bodyText.toLowerCase().includes('captcha')) {
          captchaDetected = true;
        } else if (status >= 200 && status < 400 && bodyText.length > 500) {
          currentUrlOk = true;
        }
      } catch (e) {
        currentUrlOk = false;
      }
    }

    if (captchaDetected) {
      blockedCount++;
      console.log(`⚠️ BLOCKED (CAPTCHA / Human Verification Page) [#${idx + 1}]: ${modelName}`);
      stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${modelName.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","BLOCKED","Captcha/Protection triggered on real browser"`);
      continue;
    }

    if (currentUrlOk && !usedImages.has(currentUrl)) {
      verifiedOkCount++;
      usedImages.add(currentUrl);

      const title = toTitleCase(modelName);
      const brand = 'Haier';
      const category = normalizeCategory(r.Category, title);
      const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 65000;
      const discountPrice = Math.round(priceNum * 0.95);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, category, brand, priceNum, discountPrice, currentUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
      );
      console.log(`✅ VERIFIED_OK [#${idx + 1}]: ${modelName} -> (${currentUrl})`);
    } else {
      // Step 2: Open official brand site https://www.haier.com/pk
      await delay(2500);
      let foundImgUrl = null;

      try {
        const searchUrl = `https://www.haier.com/pk/search/?q=${encodeURIComponent(modelName)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

        const searchBody = await page.content();
        if (searchBody.toLowerCase().includes('verify you are human')) {
          blockedCount++;
          console.log(`⚠️ BLOCKED ON BRAND SITE SEARCH [#${idx + 1}]: ${modelName}`);
          stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${modelName.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","BLOCKED","Brand site search captcha"`);
          continue;
        }

        // Extract product image from search page
        foundImgUrl = await page.evaluate((mName) => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const cleanM = mName.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const img of imgs) {
            const alt = (img.alt || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const src = img.src || '';
            if (cleanM.length > 3 && (alt.includes(cleanM) || src.toLowerCase().includes(cleanM))) {
              return src;
            }
          }
          return null;
        }, modelName);
      } catch (e) {
        foundImgUrl = null;
      }

      if (foundImgUrl && !usedImages.has(foundImgUrl)) {
        // Download and attach locally
        const title = toTitleCase(modelName);
        const slug = `haier-${modelName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const targetPath = path.join(targetImagesDir, `${slug}.png`);
        const relativeUrl = `/images/${slug}.png`;

        try {
          const viewSource = await page.goto(foundImgUrl, { waitUntil: 'networkidle2', timeout: 10000 });
          const buffer = await viewSource.buffer();

          await sharp(buffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 95 })
            .toFile(targetPath);

          fixedAndUploadedCount++;
          usedImages.add(relativeUrl);

          const category = normalizeCategory(r.Category, title);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 65000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, category, 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          console.log(`🛠️ FIXED_AND_UPLOADED [#${idx + 1}]: ${modelName} -> Attached Local ${relativeUrl}`);
        } catch (err) {
          stillUnverifiedCount++;
          stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${modelName.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model image download failed"`);
          console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: ${modelName} (Download failed)`);
        }
      } else {
        stillUnverifiedCount++;
        stillUnverifiedEntries.push(`"${stillUnverifiedEntries.length + 1}","Haier","${r.Category || ''}","${modelName.replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","","STILL_UNVERIFIED","Model truly not found on official site https://www.haier.com/pk"`);
        console.log(`❌ STILL_UNVERIFIED [#${idx + 1}]: ${modelName} (Not found on official site)`);
      }
    }
  }

  await browser.close();

  // Update CDN_Still_Unverified.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(stillUnverifiedFile, uHeader + stillUnverifiedEntries.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 REAL BROWSER REPORT — BRAND 1 (HAIER - 9 PRODUCTS)");
  console.log("🌐 Official Portal: https://www.haier.com/pk");
  console.log("==================================================");
  console.log(`✅ VERIFIED_OK: ${verifiedOkCount}`);
  console.log(`🛠️ FIXED_AND_UPLOADED: ${fixedAndUploadedCount}`);
  console.log(`❌ STILL_UNVERIFIED (Exported to CDN_Still_Unverified.csv): ${stillUnverifiedCount}`);
  console.log(`⚠️ BLOCKED (Captcha/Protection Triggered): ${blockedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processRealBrowserHaier().catch(console.error);
