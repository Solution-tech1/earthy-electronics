const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function bingSearchImages() {
  console.log("==================================================");
  console.log("🔍 BING IMAGE SEARCH FOR EXACT MODEL DISPENSERS & WASHING MACHINES");
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

  console.log(`Found ${productsToFix.length} products requiring unique real images...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let updatedCount = 0;

  for (let idx = 0; idx < productsToFix.length; idx++) {
    const p = productsToFix[idx];
    let cleanName = p.name.replace(/^Haier\s+/i, '').replace(/^Dawlance\s+/i, '').replace(/^Samsung\s+/i, '').replace(/^Orient\s+/i, '').replace(/^PEL\s+/i, '').trim();
    const searchQuery = `${p.brand} ${cleanName} white background png`;
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`;

    console.log(`[${idx+1}/${productsToFix.length}] Searching Bing Images for: "${p.brand} ${cleanName}" ...`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      await delay(1200);

      // Extract high-res image URL from Bing .murl attribute
      const matchedImgUrl = await page.evaluate(() => {
        const mElements = document.querySelectorAll('a.iusc, div[m]');
        for (const el of mElements) {
          const mAttr = el.getAttribute('m');
          if (mAttr) {
            try {
              const mData = JSON.parse(mAttr);
              if (mData.murl && mData.murl.startsWith('http') && !mData.murl.includes('bing.com')) {
                return mData.murl;
              }
            } catch (e) {}
          }
        }
        return null;
      });

      if (matchedImgUrl) {
        const slug = `${p.brand}-${cleanName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const localFilename = `${slug}.jpg`;
        const localAbsPath = path.join(imagesOutputDir, localFilename);
        const relativeWebPath = `/images/products/${localFilename}`;

        const tempRaw = path.join(imagesOutputDir, `temp_b_${slug}.jpg`);
        const client = matchedImgUrl.startsWith('https') ? https : http;

        await new Promise((res) => {
          const req = client.get(matchedImgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
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
          updatedCount++;
          console.log(`   ✅ [ID ${p.id}] Updated -> ${relativeWebPath}`);
        } else {
          if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
          console.log(`   ❌ [ID ${p.id}] Downloaded image too small/invalid.`);
        }
      } else {
        console.log(`   ❌ [ID ${p.id}] No image URL found on Bing.`);
      }

    } catch (e) {
      console.log(`   ❌ [ID ${p.id}] Search error: ${e.message}`);
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(`✅ BING IMAGE SEARCH COMPLETE: Updated ${updatedCount} products with unique real model images!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

bingSearchImages().catch(console.error);
