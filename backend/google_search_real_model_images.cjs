const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function googleSearchRealModelImages() {
  console.log("==================================================");
  console.log("🔍 GOOGLE IMAGE SEARCH FOR EXACT MODEL DISPENSERS & WASHING MACHINES");
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

  console.log(`Found ${productsToFix.length} products to search on Google Images...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let successCount = 0;

  for (let idx = 0; idx < productsToFix.length; idx++) {
    const p = productsToFix[idx];
    const searchQuery = `${p.name} official product png`;
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;

    console.log(`[${idx+1}/${productsToFix.length}] Searching Google for: "${searchQuery}" ...`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(1500);

      // Extract direct image URLs from Google search result page
      const imageUrls = await page.evaluate(() => {
        const urls = [];
        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.src || img.getAttribute('data-src');
          if (src && src.startsWith('http') && !src.includes('google.com') && !src.includes('gstatic')) {
            urls.push(src);
          }
        });
        return urls;
      });

      let targetUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      if (!targetUrl) {
        // Fallback: get first thumbnail or image link
        targetUrl = await page.evaluate(() => {
          const img = document.querySelector('div[data-ri="0"] img, table.g img, img[src^="http"]');
          return img ? (img.src || img.getAttribute('data-src')) : null;
        });
      }

      if (targetUrl && targetUrl.startsWith('http')) {
        const slug = `${p.brand}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const localFilename = `${slug}.jpg`;
        const localAbsPath = path.join(imagesOutputDir, localFilename);
        const relativeWebPath = `/images/products/${localFilename}`;

        const tempRaw = path.join(imagesOutputDir, `temp_g_${slug}.jpg`);
        const client = targetUrl.startsWith('https') ? https : http;

        await new Promise((res, rej) => {
          const req = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
            if (resp.statusCode !== 200) return res();
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
          req.on('error', () => res());
          req.setTimeout(8000, () => { req.destroy(); res(); });
        });

        if (fs.existsSync(tempRaw) && fs.statSync(tempRaw).size > 1000) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 92 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRaw);
          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          successCount++;
          console.log(`   ✅ [ID ${p.id}] Updated -> ${relativeWebPath}`);
        } else {
          if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
          console.log(`   ❌ [ID ${p.id}] Downloaded image too small/invalid.`);
        }
      } else {
        console.log(`   ❌ [ID ${p.id}] No image found on Google.`);
      }

    } catch (e) {
      console.log(`   ❌ [ID ${p.id}] Search failed: ${e.message}`);
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(`✅ GOOGLE IMAGE SEARCH COMPLETE: Updated ${successCount} products!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

googleSearchRealModelImages().catch(console.error);
