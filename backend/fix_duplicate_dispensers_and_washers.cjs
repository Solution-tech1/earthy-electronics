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

async function fixDuplicates() {
  console.log("==================================================");
  console.log("🛠️ SEARCHING & FIXING REAL MODEL IMAGES FOR DISPENSERS & WASHING MACHINES");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  // Query all duplicate dispenser & washing machine products
  const [duplicateProducts] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE image IN ('/images/product_dispenser.png', '/images/cat_washer.png') 
        OR image LIKE '%faysalbank.com%'`
  );

  console.log(`Found ${duplicateProducts.length} products requiring unique real image search...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. Scrape pak-electronics.pk washing machines & water dispensers
  const sourcePages = [
    'https://pak-electronics.pk/product-category/water-dispenser/',
    'https://pak-electronics.pk/product-category/washing-machine/',
    'https://pak-electronics.pk/product-category/washing-machine/page/2/',
    'https://pak-electronics.pk/product-category/washing-machine/page/3/',
    'https://www.qistbazaar.pk/product-category/water-dispenser/',
    'https://www.qistbazaar.pk/product-category/washing-machine/'
  ];

  const scrapedCatalog = [];

  for (const sUrl of sourcePages) {
    console.log(`Scraping images from ${sUrl} ...`);
    try {
      await page.goto(sUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      await delay(2000);

      const pageItems = await page.evaluate(() => {
        const list = [];
        const cards = document.querySelectorAll('li.product, .type-product, .product, .product-grid-item');
        cards.forEach(c => {
          const aTag = c.querySelector('a.woocommerce-LoopProduct-link, .woocommerce-loop-product__title, .product-title, h2 a, h3 a, a');
          const imgTag = c.querySelector('img');
          const title = aTag ? aTag.textContent.trim().replace(/\s+/g, ' ') : '';
          const imgSrc = imgTag ? (imgTag.getAttribute('data-src') || imgTag.getAttribute('data-lazy-src') || imgTag.src) : '';

          if (title.length > 5 && imgSrc && !imgSrc.includes('logo')) {
            list.push({ title, imgSrc });
          }
        });
        return list;
      });

      console.log(`   Scraped ${pageItems.length} items from ${sUrl}`);
      scrapedCatalog.push(...pageItems);
    } catch (e) {}
  }

  await browser.close();

  console.log(`\nTotal Scraped Image Pool: ${scrapedCatalog.length} products`);

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let updatedCount = 0;

  for (const p of duplicateProducts) {
    const coreNum = getCoreNumber(p.name);
    const brandUpper = p.brand.toUpperCase();

    // Find best matching item in scraped image pool
    const match = scrapedCatalog.find(item => {
      const itemTitleUpper = item.title.toUpperCase();
      if (coreNum && coreNum.length >= 2) {
        return itemTitleUpper.includes(brandUpper) && itemTitleUpper.includes(coreNum);
      }
      return itemTitleUpper.includes(brandUpper);
    });

    if (match && match.imgSrc) {
      const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localFilename = `${slug}.jpg`;
      const localAbsPath = path.join(imagesOutputDir, localFilename);
      const relativeWebPath = `/images/products/${localFilename}`;

      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${slug}.jpg`);
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
    } else {
      console.log(`[ID ${p.id}] No unique scraped match found for ${p.name}`);
    }
  }

  console.log("\n==================================================");
  console.log(`✅ Successfully updated ${updatedCount} products with unique model real images!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

fixDuplicates().catch(console.error);
