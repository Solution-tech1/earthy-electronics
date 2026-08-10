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
  const numMatch = clean.match(/\d+/);
  return numMatch ? numMatch[0] : '';
}

async function fixWashersDispensersReal() {
  console.log("==================================================");
  console.log("🛠️ FIXING REAL MODEL IMAGES FOR WASHERS & DISPENSERS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [productsToFix] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE image IN ('/images/product_dispenser.png', '/images/cat_washer.png') 
        OR image LIKE '%faysalbank.com%'`
  );

  console.log(`Found ${productsToFix.length} products to update with real images...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // Correct Plural URLs on pak-electronics.pk & qistbazaar.pk
  const categoryUrls = [
    'https://pak-electronics.pk/product-category/washing-machines/',
    'https://pak-electronics.pk/product-category/washing-machines/page/2/',
    'https://pak-electronics.pk/product-category/washing-machines/page/3/',
    'https://pak-electronics.pk/product-category/water-dispenser/',
    'https://www.qistbazaar.pk/product-category/washing-machine/',
    'https://www.qistbazaar.pk/product-category/washing-machine/page/2/',
    'https://www.qistbazaar.pk/product-category/water-dispenser/'
  ];

  const scrapedPool = [];

  for (const cUrl of categoryUrls) {
    console.log(`Scraping real product images from ${cUrl} ...`);
    try {
      await page.goto(cUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      await delay(2000);

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

      const items = await page.evaluate(() => {
        const arr = [];
        const links = document.querySelectorAll('a[href*="/product/"], .product-title, h2, h3, a');
        links.forEach(el => {
          const title = el.textContent.trim().replace(/\s+/g, ' ');
          let img = el.querySelector('img') || el.parentElement?.querySelector('img') || el.closest('.product')?.querySelector('img');
          const imgSrc = img ? (img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src) : '';

          if (title.length > 5 && imgSrc && !imgSrc.includes('logo') && !title.includes('Filter') && !title.includes('Select options')) {
            arr.push({ title, imgSrc });
          }
        });
        return arr;
      });

      console.log(`   Scraped ${items.length} items from ${cUrl}`);
      scrapedPool.push(...items);
    } catch (e) {}
  }

  await browser.close();

  // Deduplicate pool
  const cleanPool = [];
  const seen = new Set();
  scrapedPool.forEach(it => {
    if (!seen.has(it.title.toLowerCase())) {
      seen.add(it.title.toLowerCase());
      cleanPool.push(it);
    }
  });

  console.log(`\n✅ TOTAL SCRAPED REAL MODEL IMAGE POOL: ${cleanPool.length}`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let updatedCount = 0;

  for (const p of productsToFix) {
    const coreNum = getCoreNumber(p.name);
    const brandUpper = p.brand.toUpperCase();

    // Match in cleanPool
    const matched = cleanPool.find(it => {
      const titleUpper = it.title.toUpperCase();
      if (coreNum && coreNum.length >= 2) {
        return titleUpper.includes(brandUpper) && titleUpper.includes(coreNum);
      }
      return titleUpper.includes(brandUpper);
    });

    if (matched && matched.imgSrc) {
      const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localFilename = `${slug}.jpg`;
      const localAbsPath = path.join(imagesOutputDir, localFilename);
      const relativeWebPath = `/images/products/${localFilename}`;

      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${slug}.jpg`);
        const client = matched.imgSrc.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(matched.imgSrc, (resp) => {
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

        await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
        updatedCount++;
        console.log(`[ID ${p.id}] Updated ${p.name} -> ${relativeWebPath}`);

      } catch (err) {
        console.log(`[ID ${p.id}] Download failed for ${p.name}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`✅ Successfully updated ${updatedCount} products with unique real model images!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

fixWashersDispensersReal().catch(console.error);
